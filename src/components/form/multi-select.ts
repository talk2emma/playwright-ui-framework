import type { Locator } from '@playwright/test';
import { Dropdown, type DropdownOptions } from './dropdown';
import type { SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface MultiSelectOptions extends DropdownOptions {
  /** The chips/tags rendered for each selection. */
  chipSelector?: string;
  /** The per-chip remove control. */
  chipRemoveSelector?: string;
  /** Control that clears every selection at once. */
  clearAllSelector?: string;
}

/**
 * Multi-select / tag input: several values selected at once, usually rendered
 * as removable chips.
 */
export class MultiSelect extends Dropdown {
  private readonly chipSelector: string;
  private readonly chipRemoveSelector: string;
  private readonly clearAllSelector: string;

  protected override get componentType(): string {
    return 'MultiSelect';
  }

  constructor(scope: Scope, selector: SelectorLike, options: MultiSelectOptions = {}) {
    super(scope, selector, options);
    this.chipSelector = options.chipSelector ?? '[data-testid="chip"], .chip, .tag, .multi-value';
    this.chipRemoveSelector =
      options.chipRemoveSelector ?? '[aria-label*="remove" i], .remove, .chip-close, button';
    this.clearAllSelector = options.clearAllSelector ?? '[aria-label*="clear" i], .clear-all';
  }

  get chips(): Locator {
    return this.locator.locator(this.chipSelector);
  }

  async selectMany(labels: string[]): Promise<void> {
    await this.step(`select ${labels.length} option(s)`, async () => {
      for (const label of labels) {
        await this.open();
        if (this.searchSelector) await this.search(label);
        await this.optionsLocator
          .filter({ hasText: label })
          .first()
          .click({ timeout: this.timeout });
      }
      await this.close();
    });
  }

  async getSelectedItems(): Promise<string[]> {
    const texts = await this.chips.allInnerTexts();
    return texts.map((text) => text.replace(/[×x]\s*$/i, '').trim()).filter(Boolean);
  }

  async removeItem(label: string): Promise<void> {
    await this.step(`remove "${label}"`, async () => {
      const chip = this.chips.filter({ hasText: label }).first();
      await chip.waitFor({ state: 'visible', timeout: this.timeout });
      const remove = chip.locator(this.chipRemoveSelector).first();
      if ((await remove.count()) > 0) await remove.click({ timeout: this.timeout });
      else await chip.click({ timeout: this.timeout });
    });
  }

  async clearAll(): Promise<void> {
    await this.step('clear all selections', async () => {
      const clear = this.locator.locator(this.clearAllSelector).first();
      if ((await clear.count()) > 0) {
        await clear.click({ timeout: this.timeout });
        return;
      }
      for (const item of await this.getSelectedItems()) await this.removeItem(item);
    });
  }

  async selectedCount(): Promise<number> {
    return this.chips.count();
  }

  async isSelected(label: string): Promise<boolean> {
    return (await this.getSelectedItems()).some((item) => item.includes(label));
  }

  /** Backspace in an empty tag input removes the last chip. */
  async removeLastWithKeyboard(): Promise<void> {
    await this.step('remove last chip with Backspace', async () => {
      await this.locator.click();
      await this.page.keyboard.press('Backspace');
    });
  }
}
