import { BaseComponent } from '../../core/base.component';
import type { Locator, Page } from '@playwright/test';

/**
 * Web component with a shadow root.
 *
 * Playwright's engine pierces *open* shadow roots automatically, so plain
 * locators usually work. This class exists for the parts that do not:
 * closed roots, slotted content, and inspecting the boundary itself.
 */
export class ShadowHost extends BaseComponent {
  protected override get componentType(): string {
    return 'ShadowHost';
  }

  /** Element inside the shadow tree. Open roots are pierced automatically. */
  inShadow(selector: string): Locator {
    return this.locator.locator(selector);
  }

  async hasShadowRoot(): Promise<boolean> {
    return this.locator.evaluate((element) => element.shadowRoot !== null);
  }

  async getShadowMode(): Promise<'open' | 'closed' | 'none'> {
    return this.locator.evaluate((element) =>
      element.shadowRoot ? element.shadowRoot.mode : 'none',
    );
  }

  /** Text of an element inside the shadow root, read through the DOM API. */
  async getShadowText(selector: string): Promise<string> {
    return this.locator.evaluate(
      (element, innerSelector) =>
        element.shadowRoot?.querySelector(innerSelector)?.textContent?.trim() ?? '',
      selector,
    );
  }

  /** Clicks inside the shadow root via the DOM when the locator engine cannot. */
  async clickInShadow(selector: string): Promise<void> {
    await this.step(`click "${selector}" inside shadow root`, async () => {
      await this.locator.evaluate((element, innerSelector) => {
        const target = element.shadowRoot?.querySelector(innerSelector);
        if (!target) throw new Error(`No "${innerSelector}" inside the shadow root`);
        (target as HTMLElement).click();
      }, selector);
    });
  }

  /** Light-DOM nodes projected into a `<slot>`. */
  async getSlottedContent(slotName?: string): Promise<string[]> {
    return this.locator.evaluate((element, name) => {
      const selector = name ? `slot[name="${name}"]` : 'slot';
      const slot = element.shadowRoot?.querySelector(selector);
      if (!(slot instanceof HTMLSlotElement)) return [];
      return slot.assignedNodes().map((node) => node.textContent?.trim() ?? '');
    }, slotName);
  }

  /** Every custom element on the page — useful for discovery and audits. */
  static async listCustomElements(page: Page): Promise<string[]> {
    return page.evaluate(() =>
      Array.from(
        new Set(
          Array.from(document.querySelectorAll('*'))
            .map((element) => element.tagName.toLowerCase())
            .filter((tag) => tag.includes('-')),
        ),
      ),
    );
  }
}
