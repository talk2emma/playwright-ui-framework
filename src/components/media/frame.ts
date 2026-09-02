import type { FrameLocator, Locator, Page } from '@playwright/test';
import { createLogger, type Logger } from '../../utils/logger';
import { TIMEOUTS } from '../../config/timeouts';

/**
 * iframe wrapper.
 *
 * Frames are not components — they are *scopes*. This class hands you a
 * `FrameLocator` that every other component can be constructed against, so
 * cross-frame testing needs no special-case code anywhere else:
 *
 *   const frame = new Frame(page, '#payment-iframe');
 *   const cardNumber = new TextInput(frame.locator, '#card-number');
 */
export class Frame {
  private readonly log: Logger;

  constructor(
    private readonly page: Page,
    private readonly selector: string,
    readonly name = selector,
  ) {
    this.log = createLogger('Frame');
  }

  /** Scope to pass into component constructors. */
  get locator(): FrameLocator {
    return this.page.frameLocator(this.selector);
  }

  /** The iframe element itself — for size, visibility and attribute checks. */
  get element(): Locator {
    return this.page.locator(this.selector);
  }

  async waitForLoaded(timeout = TIMEOUTS.LONG): Promise<void> {
    await this.element.waitFor({ state: 'visible', timeout });
    await this.page
      .waitForFunction(
        (selector) => {
          const frame = document.querySelector<HTMLIFrameElement>(selector);
          return frame?.contentDocument?.readyState === 'complete';
        },
        this.selector,
        { timeout },
      )
      .catch(() => {
        // Cross-origin frames cannot be inspected from the parent document.
        this.log.debug('Frame readiness not observable (likely cross-origin)', {
          frame: this.name,
        });
      });
  }

  child(selector: string): Frame {
    const nested = new Frame(
      this.page,
      `${this.selector} >> ${selector}`,
      `${this.name}/${selector}`,
    );
    return nested;
  }

  async getUrl(): Promise<string | null> {
    return this.element.getAttribute('src');
  }

  async count(): Promise<number> {
    return this.element.count();
  }

  /** Runs JS inside the frame's own document (same-origin only). */
  async evaluate<T>(fn: () => T): Promise<T> {
    const frame = this.page.frames().find((candidate) => candidate.url().includes(this.selector));
    const target = frame ?? this.page.mainFrame();
    return target.evaluate(fn);
  }

  /** Lists every frame on the page — useful when the selector is unknown. */
  static listFrames(page: Page): Array<{ name: string; url: string }> {
    return page.frames().map((frame) => ({ name: frame.name(), url: frame.url() }));
  }
}
