import type { Locator } from '@playwright/test';
import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import { TIMEOUTS } from '../../config/timeouts';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface TooltipOptions extends ComponentOptions {
  /** Where the tooltip body renders — usually portalled to the body. */
  tooltipSelector?: string;
  /** How the tooltip is triggered. */
  trigger?: 'hover' | 'click' | 'focus';
}

/**
 * Tooltip / popover. The component wraps the *trigger*; the bubble is found
 * separately because it is nearly always portalled elsewhere in the DOM.
 */
export class Tooltip extends BaseComponent {
  private readonly tooltipSelector: string;
  private readonly trigger: 'hover' | 'click' | 'focus';

  protected override get componentType(): string {
    return 'Tooltip';
  }

  constructor(scope: Scope, selector: SelectorLike, options: TooltipOptions = {}) {
    super(scope, selector, options);
    this.tooltipSelector = options.tooltipSelector ?? '[role="tooltip"], .tooltip, .popover';
    this.trigger = options.trigger ?? 'hover';
  }

  get bubble(): Locator {
    return this.page.locator(this.tooltipSelector).first();
  }

  /** Triggers the tooltip and returns its text. */
  async show(): Promise<string> {
    return this.step('show tooltip', async () => {
      await this.prepare();
      if (this.trigger === 'hover') await this.locator.hover({ timeout: this.timeout });
      else if (this.trigger === 'click') await this.locator.click({ timeout: this.timeout });
      else await this.locator.focus({ timeout: this.timeout });

      await this.bubble.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });
      return normalizeText(await this.bubble.innerText());
    });
  }

  async hide(): Promise<void> {
    await this.step('hide tooltip', async () => {
      await this.page.mouse.move(0, 0);
      await this.bubble
        .waitFor({ state: 'hidden', timeout: TIMEOUTS.SHORT })
        .catch(() => undefined);
    });
  }

  async isVisible(): Promise<boolean> {
    return this.bubble.isVisible().catch(() => false);
  }

  async getText(): Promise<string> {
    return normalizeText(await this.bubble.innerText());
  }

  /** Native `title` attribute tooltips never render as DOM — read them directly. */
  async getNativeTitle(): Promise<string | null> {
    return this.getAttribute('title');
  }

  /** Where the bubble landed relative to the trigger — for placement assertions. */
  async getPlacement(): Promise<'top' | 'bottom' | 'left' | 'right' | 'unknown'> {
    const explicit = await this.bubble.getAttribute('data-placement');
    if (explicit && ['top', 'bottom', 'left', 'right'].includes(explicit)) {
      return explicit as 'top' | 'bottom' | 'left' | 'right';
    }
    const [triggerBox, bubbleBox] = await Promise.all([
      this.locator.boundingBox(),
      this.bubble.boundingBox(),
    ]);
    if (!triggerBox || !bubbleBox) return 'unknown';
    if (bubbleBox.y + bubbleBox.height <= triggerBox.y + 5) return 'top';
    if (bubbleBox.y >= triggerBox.y + triggerBox.height - 5) return 'bottom';
    return bubbleBox.x < triggerBox.x ? 'left' : 'right';
  }

  /** Accessible tooltips link the trigger to the bubble via aria-describedby. */
  async isAccessiblyLinked(): Promise<boolean> {
    const describedBy = await this.getAttribute('aria-describedby');
    if (!describedBy) return false;
    return (await this.page.locator(`#${describedBy}`).count()) > 0;
  }
}
