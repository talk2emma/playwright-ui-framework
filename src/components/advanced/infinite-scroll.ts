import { BaseComponent } from '../../core/base.component';
import { TIMEOUTS } from '../../config/timeouts';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface InfiniteScrollOptions extends ComponentOptions {
  itemSelector?: string;
  loadingSelector?: string;
  endMarkerSelector?: string;
  /** Scrolls the window rather than an inner container. */
  scrollWindow?: boolean;
}

/**
 * Infinite-scroll / lazy-loaded list.
 *
 * The hard part is knowing when loading has stopped: this waits for the item
 * count to stabilise rather than trusting a spinner that may never render.
 */
export class InfiniteScroll extends BaseComponent {
  private readonly itemSelector: string;
  private readonly loadingSelector: string;
  private readonly endMarkerSelector: string;
  private readonly scrollWindow: boolean;

  protected override get componentType(): string {
    return 'InfiniteScroll';
  }

  constructor(scope: Scope, selector: SelectorLike, options: InfiniteScrollOptions = {}) {
    super(scope, selector, options);
    this.itemSelector = options.itemSelector ?? '.item, li, [role="listitem"]';
    this.loadingSelector = options.loadingSelector ?? '.loading, .spinner, [aria-busy="true"]';
    this.endMarkerSelector = options.endMarkerSelector ?? '.end-of-list, .no-more';
    this.scrollWindow = options.scrollWindow ?? false;
  }

  get items(): Locator {
    return this.locator.locator(this.itemSelector);
  }

  async itemCount(): Promise<number> {
    return this.items.count();
  }

  /** Scrolls once and waits for whatever it loaded. Returns the new count. */
  async loadMore(): Promise<number> {
    return this.step('load more', async () => {
      const before = await this.itemCount();
      await this.scrollToBottom();
      await this.waitForLoadingToFinish();
      await this.waitForCountChange(before);
      return this.itemCount();
    });
  }

  /**
   * Scrolls until no new items arrive, the end marker appears, or the cap is
   * reached. The cap is a safety net: never scroll an unbounded feed forever.
   */
  async loadAll(maxScrolls = 25): Promise<number> {
    return this.step(`load all (max ${maxScrolls} scrolls)`, async () => {
      let previous = -1;
      for (let attempt = 0; attempt < maxScrolls; attempt++) {
        const current = await this.itemCount();
        if (current === previous || (await this.hasReachedEnd())) break;
        previous = current;
        await this.scrollToBottom();
        await this.waitForLoadingToFinish();
        await this.page.waitForTimeout(TIMEOUTS.POLL_INTERVAL);
      }
      return this.itemCount();
    });
  }

  /** Scrolls until an item with the given text appears. */
  async scrollToItem(text: string, maxScrolls = 25): Promise<Locator> {
    return this.step(`scroll to "${text}"`, async () => {
      for (let attempt = 0; attempt < maxScrolls; attempt++) {
        const match = this.items.filter({ hasText: text }).first();
        if ((await match.count()) > 0) {
          await match.scrollIntoViewIfNeeded();
          return match;
        }
        await this.scrollToBottom();
        await this.waitForLoadingToFinish();
      }
      throw new Error(`${this.label}: "${text}" not found after ${maxScrolls} scrolls`);
    });
  }

  async hasReachedEnd(): Promise<boolean> {
    return this.page
      .locator(this.endMarkerSelector)
      .first()
      .isVisible()
      .catch(() => false);
  }

  async isLoading(): Promise<boolean> {
    return this.page
      .locator(this.loadingSelector)
      .first()
      .isVisible()
      .catch(() => false);
  }

  async scrollToBottom(): Promise<void> {
    if (this.scrollWindow) {
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      return;
    }
    await this.locator.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
  }

  async scrollToTop(): Promise<void> {
    if (this.scrollWindow) {
      await this.page.evaluate(() => window.scrollTo(0, 0));
      return;
    }
    await this.locator.evaluate((element) => {
      element.scrollTop = 0;
    });
  }

  private async waitForLoadingToFinish(timeout = TIMEOUTS.MEDIUM): Promise<void> {
    const spinner = this.page.locator(this.loadingSelector).first();
    await spinner.waitFor({ state: 'visible', timeout: TIMEOUTS.INSTANT }).catch(() => undefined);
    await spinner.waitFor({ state: 'hidden', timeout }).catch(() => undefined);
  }

  private async waitForCountChange(previous: number, timeout = TIMEOUTS.MEDIUM): Promise<void> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if ((await this.itemCount()) !== previous) return;
      await this.page.waitForTimeout(TIMEOUTS.POLL_INTERVAL);
    }
  }
}
