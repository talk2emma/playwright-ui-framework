import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface BreadcrumbOptions extends ComponentOptions {
  itemSelector?: string;
  separator?: string;
}

/** Breadcrumb trail — position within the hierarchy, and navigation up it. */
export class Breadcrumb extends BaseComponent {
  private readonly itemSelector: string;
  private readonly separator: string;

  protected override get componentType(): string {
    return 'Breadcrumb';
  }

  constructor(scope: Scope, selector: SelectorLike, options: BreadcrumbOptions = {}) {
    super(scope, selector, options);
    this.itemSelector = options.itemSelector ?? 'li, a, [role="listitem"]';
    this.separator = options.separator ?? '/';
  }

  get items(): Locator {
    return this.locator.locator(this.itemSelector);
  }

  async getTrail(): Promise<string[]> {
    return (await this.items.allInnerTexts())
      .map(normalizeText)
      .map((text) => text.replace(new RegExp(`\\s*${escapeRegex(this.separator)}\\s*$`), ''))
      .filter(Boolean);
  }

  async getCurrent(): Promise<string> {
    const current = this.locator.locator('[aria-current="page"], .active').first();
    if ((await current.count()) > 0) return normalizeText(await current.innerText());
    const trail = await this.getTrail();
    return trail[trail.length - 1] ?? '';
  }

  async navigateTo(name: string | RegExp): Promise<void> {
    await this.step(`navigate to "${String(name)}"`, async () => {
      await this.items.filter({ hasText: name }).first().click({ timeout: this.timeout });
    });
  }

  async goUp(levels = 1): Promise<void> {
    await this.step(`go up ${levels} level(s)`, async () => {
      const trail = await this.getTrail();
      const target = trail[trail.length - 1 - levels];
      if (!target)
        throw new Error(`${this.label}: cannot go up ${levels} from ${trail.join(' / ')}`);
      await this.navigateTo(target);
    });
  }

  async depth(): Promise<number> {
    return (await this.getTrail()).length;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
