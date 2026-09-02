import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import { TIMEOUTS } from '../../config/timeouts';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface MenuOptions extends ComponentOptions {
  itemSelector?: string;
  submenuSelector?: string;
  /** Some menus open on hover rather than click. */
  openOn?: 'click' | 'hover';
}

/**
 * Navigation menu / menubar / context menu, including nested submenus.
 */
export class Menu extends BaseComponent {
  private readonly itemSelector: string;
  private readonly submenuSelector: string;
  private readonly openOn: 'click' | 'hover';

  protected override get componentType(): string {
    return 'Menu';
  }

  constructor(scope: Scope, selector: SelectorLike, options: MenuOptions = {}) {
    super(scope, selector, options);
    this.itemSelector = options.itemSelector ?? '[role="menuitem"], a, li > button';
    this.submenuSelector = options.submenuSelector ?? '[role="menu"], .submenu, ul';
    this.openOn = options.openOn ?? 'click';
  }

  get items(): Locator {
    return this.locator.locator(this.itemSelector);
  }

  item(name: string | RegExp): Locator {
    return this.items.filter({ hasText: name }).first();
  }

  /** Clicks a top-level entry by name. Use `navigateTo` for nested paths. */
  async clickItem(name: string | RegExp): Promise<void> {
    await this.step(`click item "${String(name)}"`, async () => {
      await this.item(name).click({ timeout: this.timeout });
    });
  }

  /**
   * Walks a nested path, opening each level the way the menu expects.
   * `['Reports', 'Sales', 'By region']`
   */
  async navigateTo(path: string[]): Promise<void> {
    await this.step(`navigate ${path.join(' > ')}`, async () => {
      let scope: Locator = this.locator;
      for (const [index, segment] of path.entries()) {
        const entry = scope.locator(this.itemSelector).filter({ hasText: segment }).first();
        await entry.waitFor({ state: 'visible', timeout: this.timeout });
        if (index < path.length - 1) {
          if (this.openOn === 'hover') await entry.hover({ timeout: this.timeout });
          else await entry.click({ timeout: this.timeout });
          const submenu = entry.locator(`xpath=..`).locator(this.submenuSelector).first();
          await submenu
            .waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT })
            .catch(() => undefined);
          scope = (await submenu.count()) > 0 ? submenu : this.locator;
        } else {
          await entry.click({ timeout: this.timeout });
        }
      }
    });
  }

  async getItemNames(): Promise<string[]> {
    return (await this.items.allInnerTexts()).map(normalizeText).filter(Boolean);
  }

  async hasItem(name: string): Promise<boolean> {
    return (await this.item(name).count()) > 0;
  }

  async isItemDisabled(name: string): Promise<boolean> {
    const entry = this.item(name);
    const [ariaDisabled, className] = await Promise.all([
      entry.getAttribute('aria-disabled'),
      entry.getAttribute('class'),
    ]);
    return ariaDisabled === 'true' || /disabled/i.test(className ?? '');
  }

  async getActiveItem(): Promise<string> {
    const active = this.locator.locator('[aria-current], .active, .selected').first();
    return normalizeText(await active.innerText().catch(() => ''));
  }

  /** Opens a context menu at the given element and returns this menu. */
  async openContextMenu(target: Locator): Promise<void> {
    await this.step('open context menu', async () => {
      await target.click({ button: 'right', timeout: this.timeout });
      await this.locator.waitFor({ state: 'visible', timeout: this.timeout });
    });
  }
}
