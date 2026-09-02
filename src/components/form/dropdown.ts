import type { Locator } from '@playwright/test';
import { BaseComponent } from '../../core/base.component';
import { TIMEOUTS } from '../../config/timeouts';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface DropdownOptions extends ComponentOptions {
  /** The panel that appears on open. Often rendered in a portal at body level. */
  panelSelector?: string;
  /** Individual option rows inside the panel. */
  optionSelector?: string;
  /** Element showing the current selection when it is not the trigger itself. */
  valueSelector?: string;
  /** Search field rendered inside the panel. */
  searchSelector?: string;
}

/**
 * Custom (non-native) dropdown / combobox / listbox — React-Select, MUI,
 * Ant Design, Kendo and friends.
 *
 * The trigger locator is the visible control; the panel is looked up on the
 * page (not under the trigger) because most libraries portal it to `<body>`.
 */
export class Dropdown extends BaseComponent {
  protected readonly panelSelector: string;
  protected readonly optionSelector: string;
  protected readonly valueSelector: string | undefined;
  protected readonly searchSelector: string | undefined;

  protected override get componentType(): string {
    return 'Dropdown';
  }

  constructor(scope: Scope, selector: SelectorLike, options: DropdownOptions = {}) {
    super(scope, selector, options);
    this.panelSelector = options.panelSelector ?? '[role="listbox"], [role="menu"], .dropdown-menu';
    this.optionSelector = options.optionSelector ?? '[role="option"], [role="menuitem"], li';
    this.valueSelector = options.valueSelector;
    this.searchSelector = options.searchSelector;
  }

  get panel(): Locator {
    return this.page.locator(this.panelSelector).first();
  }

  get optionsLocator(): Locator {
    return this.panel.locator(this.optionSelector);
  }

  async open(): Promise<void> {
    await this.step('open', async () => {
      if (await this.isOpen()) return;
      await this.prepare();
      await this.locator.click({ timeout: this.timeout });
      await this.panel.waitFor({ state: 'visible', timeout: this.timeout });
    });
  }

  async close(): Promise<void> {
    await this.step('close', async () => {
      if (!(await this.isOpen())) return;
      await this.page.keyboard.press('Escape');
      await this.panel.waitFor({ state: 'hidden', timeout: TIMEOUTS.SHORT }).catch(() => undefined);
    });
  }

  async isOpen(): Promise<boolean> {
    const expanded = await this.getAttribute('aria-expanded').catch(() => null);
    if (expanded !== null) return expanded === 'true';
    return this.panel.isVisible().catch(() => false);
  }

  /** Opens, optionally filters, then picks the option with this exact text. */
  async selectOption(label: string | RegExp): Promise<void> {
    await this.step(`select "${String(label)}"`, async () => {
      await this.open();
      if (this.searchSelector && typeof label === 'string') {
        await this.search(label);
      }
      const option = this.optionsLocator.filter({ hasText: label }).first();
      await option.waitFor({ state: 'visible', timeout: this.timeout });
      await option.click({ timeout: this.timeout });
      await this.panel.waitFor({ state: 'hidden', timeout: TIMEOUTS.SHORT }).catch(() => undefined);
    });
  }

  async selectByIndex(index: number): Promise<void> {
    await this.step(`select index ${index}`, async () => {
      await this.open();
      await this.optionsLocator.nth(index).click({ timeout: this.timeout });
    });
  }

  /** Types into the dropdown's own search field and waits for the list to settle. */
  async search(term: string): Promise<void> {
    if (!this.searchSelector) throw new Error(`${this.label} has no searchSelector configured`);
    const field = this.page.locator(this.searchSelector).first();
    await field.fill(term, { timeout: this.timeout });
    await this.page.waitForTimeout(TIMEOUTS.DEBOUNCE);
  }

  async getSelectedText(): Promise<string> {
    const source = this.valueSelector ? this.locator.locator(this.valueSelector) : this.locator;
    return (await source.first().innerText()).trim();
  }

  async getOptions(): Promise<string[]> {
    await this.open();
    const labels = await this.optionsLocator.allInnerTexts();
    await this.close();
    return labels.map((label) => label.trim()).filter(Boolean);
  }

  async optionCount(): Promise<number> {
    await this.open();
    return this.optionsLocator.count();
  }

  async hasOption(label: string): Promise<boolean> {
    return (await this.getOptions()).some((option) => option.includes(label));
  }

  /** Keyboard selection — the path real keyboard users take. */
  async selectWithKeyboard(steps: number): Promise<void> {
    await this.step(`select with keyboard (${steps} step(s) down)`, async () => {
      await this.locator.focus();
      await this.page.keyboard.press('Enter');
      for (let i = 0; i < steps; i++) await this.page.keyboard.press('ArrowDown');
      await this.page.keyboard.press('Enter');
    });
  }
}
