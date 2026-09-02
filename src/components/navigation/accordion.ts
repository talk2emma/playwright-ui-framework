import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface AccordionOptions extends ComponentOptions {
  headerSelector?: string;
  panelSelector?: string;
  itemSelector?: string;
}

/** Accordion / collapsible sections. */
export class Accordion extends BaseComponent {
  private readonly headerSelector: string;
  private readonly panelSelector: string;
  private readonly itemSelector: string;

  protected override get componentType(): string {
    return 'Accordion';
  }

  constructor(scope: Scope, selector: SelectorLike, options: AccordionOptions = {}) {
    super(scope, selector, options);
    this.headerSelector = options.headerSelector ?? '[role="button"], .accordion-header, summary';
    this.panelSelector = options.panelSelector ?? '[role="region"], .accordion-panel';
    this.itemSelector = options.itemSelector ?? '.accordion-item, details, section';
  }

  get headers(): Locator {
    return this.locator.locator(this.headerSelector);
  }

  header(title: string | RegExp): Locator {
    return this.headers.filter({ hasText: title }).first();
  }

  async expand(title: string | RegExp): Promise<void> {
    await this.step(`expand "${String(title)}"`, async () => {
      if (await this.isExpanded(title)) return;
      await this.header(title).click({ timeout: this.timeout });
      await this.page.waitForTimeout(200);
    });
  }

  async collapse(title: string | RegExp): Promise<void> {
    await this.step(`collapse "${String(title)}"`, async () => {
      if (!(await this.isExpanded(title))) return;
      await this.header(title).click({ timeout: this.timeout });
    });
  }

  async toggle(title: string | RegExp): Promise<void> {
    await this.step(`toggle "${String(title)}"`, async () => {
      await this.header(title).click({ timeout: this.timeout });
    });
  }

  async isExpanded(title: string | RegExp): Promise<boolean> {
    const header = this.header(title);
    const expanded = await header.getAttribute('aria-expanded').catch(() => null);
    if (expanded !== null) return expanded === 'true';
    const details = header.locator('xpath=ancestor-or-self::details').first();
    if ((await details.count()) > 0) return (await details.getAttribute('open')) !== null;
    return /open|expanded|active/i.test((await header.getAttribute('class')) ?? '');
  }

  async getContent(title: string | RegExp): Promise<string> {
    await this.expand(title);
    const controls = await this.header(title).getAttribute('aria-controls');
    const panel = controls
      ? this.page.locator(`#${controls}`)
      : this.locator
          .locator(this.itemSelector)
          .filter({ hasText: title })
          .locator(this.panelSelector)
          .first();
    return normalizeText(await panel.innerText());
  }

  async getSectionTitles(): Promise<string[]> {
    return (await this.headers.allInnerTexts()).map(normalizeText).filter(Boolean);
  }

  async sectionCount(): Promise<number> {
    return this.headers.count();
  }

  async expandAll(): Promise<void> {
    await this.step('expand all sections', async () => {
      for (const title of await this.getSectionTitles()) await this.expand(title);
    });
  }

  async collapseAll(): Promise<void> {
    await this.step('collapse all sections', async () => {
      for (const title of await this.getSectionTitles()) await this.collapse(title);
    });
  }

  /** True when opening one section closes the others. */
  async getExpandedCount(): Promise<number> {
    const titles = await this.getSectionTitles();
    const states = await Promise.all(titles.map((title) => this.isExpanded(title)));
    return states.filter(Boolean).length;
  }
}
