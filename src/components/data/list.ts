import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface ListOptions extends ComponentOptions {
  itemSelector?: string;
}

/** Ordered/unordered lists, `role="list"`, and card collections. */
export class ListView extends BaseComponent {
  private readonly itemSelector: string;

  protected override get componentType(): string {
    return 'ListView';
  }

  constructor(scope: Scope, selector: SelectorLike, options: ListOptions = {}) {
    super(scope, selector, options);
    this.itemSelector = options.itemSelector ?? 'li, [role="listitem"]';
  }

  get items(): Locator {
    return this.locator.locator(this.itemSelector);
  }

  async getItems(): Promise<string[]> {
    return (await this.items.allInnerTexts()).map(normalizeText).filter(Boolean);
  }

  async itemCount(): Promise<number> {
    return this.items.count();
  }

  async isEmpty(): Promise<boolean> {
    return (await this.itemCount()) === 0;
  }

  itemByText(text: string | RegExp): Locator {
    return this.items.filter({ hasText: text }).first();
  }

  async clickItem(text: string | RegExp): Promise<void> {
    await this.step(`click item "${String(text)}"`, async () => {
      await this.itemByText(text).click({ timeout: this.timeout });
    });
  }

  async clickItemAt(index: number): Promise<void> {
    await this.step(`click item at ${index}`, async () => {
      await this.items.nth(index).click({ timeout: this.timeout });
    });
  }

  async hasItem(text: string): Promise<boolean> {
    return (await this.itemByText(text).count()) > 0;
  }

  async getItemIndex(text: string): Promise<number> {
    return (await this.getItems()).findIndex((item) => item.includes(text));
  }

  /** Order matters for sorted/prioritised lists. */
  async isOrderedAs(expected: string[]): Promise<boolean> {
    const actual = await this.getItems();
    return expected.every((value, index) => actual[index]?.includes(value) ?? false);
  }
}
