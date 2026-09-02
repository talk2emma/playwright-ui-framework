import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface TabsOptions extends ComponentOptions {
  tabSelector?: string;
  panelSelector?: string;
}

/** Tab strip with associated panels (`role="tablist"` / `tab` / `tabpanel`). */
export class Tabs extends BaseComponent {
  private readonly tabSelector: string;
  private readonly panelSelector: string;

  protected override get componentType(): string {
    return 'Tabs';
  }

  constructor(scope: Scope, selector: SelectorLike, options: TabsOptions = {}) {
    super(scope, selector, options);
    this.tabSelector = options.tabSelector ?? '[role="tab"], .tab';
    this.panelSelector = options.panelSelector ?? '[role="tabpanel"], .tab-panel';
  }

  get tabs(): Locator {
    return this.locator.locator(this.tabSelector);
  }

  tab(name: string | RegExp): Locator {
    return this.tabs.filter({ hasText: name }).first();
  }

  async select(name: string | RegExp): Promise<void> {
    await this.step(`select tab "${String(name)}"`, async () => {
      const tab = this.tab(name);
      await tab.waitFor({ state: 'visible', timeout: this.timeout });
      await tab.click({ timeout: this.timeout });
      await this.waitForPanel(name);
    });
  }

  async selectByIndex(index: number): Promise<void> {
    await this.step(`select tab ${index}`, async () => {
      await this.tabs.nth(index).click({ timeout: this.timeout });
    });
  }

  async getActiveTab(): Promise<string> {
    const active = this.tabs
      .filter({ has: this.page.locator('[aria-selected="true"]') })
      .or(this.locator.locator('[aria-selected="true"], .tab.active'))
      .first();
    return normalizeText(await active.innerText().catch(() => ''));
  }

  async getTabNames(): Promise<string[]> {
    return (await this.tabs.allInnerTexts()).map(normalizeText).filter(Boolean);
  }

  async tabCount(): Promise<number> {
    return this.tabs.count();
  }

  async isTabActive(name: string): Promise<boolean> {
    const tab = this.tab(name);
    const [selected, className] = await Promise.all([
      tab.getAttribute('aria-selected'),
      tab.getAttribute('class'),
    ]);
    return selected === 'true' || /active|selected/i.test(className ?? '');
  }

  async isTabDisabled(name: string): Promise<boolean> {
    const tab = this.tab(name);
    const [ariaDisabled, disabled] = await Promise.all([
      tab.getAttribute('aria-disabled'),
      tab.isDisabled().catch(() => false),
    ]);
    return ariaDisabled === 'true' || disabled;
  }

  /** The panel currently shown — assert content against this. */
  get activePanel(): Locator {
    return this.locator
      .locator(this.panelSelector)
      .filter({ hasNot: this.page.locator('[hidden]') })
      .first();
  }

  /** Panel bound to a tab via aria-controls, falling back to the visible one. */
  async panelFor(name: string | RegExp): Promise<Locator> {
    const controls = await this.tab(name).getAttribute('aria-controls');
    return controls ? this.page.locator(`#${controls}`) : this.activePanel;
  }

  private async waitForPanel(name: string | RegExp): Promise<void> {
    const panel = await this.panelFor(name);
    await panel.waitFor({ state: 'visible', timeout: this.timeout }).catch(() => undefined);
  }

  /** Arrow-key navigation between tabs, per the WAI-ARIA tabs pattern. */
  async navigateWithKeyboard(direction: 'next' | 'previous'): Promise<void> {
    await this.step(`keyboard ${direction} tab`, async () => {
      await this.tabs.first().focus();
      await this.page.keyboard.press(direction === 'next' ? 'ArrowRight' : 'ArrowLeft');
    });
  }
}
