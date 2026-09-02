import { BaseComponent } from '../../core/base.component';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface PaginationOptions extends ComponentOptions {
  nextSelector?: string;
  previousSelector?: string;
  firstSelector?: string;
  lastSelector?: string;
  pageSelector?: string;
  currentPageSelector?: string;
  pageSizeSelector?: string;
  infoSelector?: string;
}

/** Pagination control: page numbers, next/previous, and page-size selection. */
export class Pagination extends BaseComponent {
  private readonly nextSelector: string;
  private readonly previousSelector: string;
  private readonly firstSelector: string;
  private readonly lastSelector: string;
  private readonly pageSelector: string;
  private readonly currentPageSelector: string;
  private readonly pageSizeSelector: string;
  private readonly infoSelector: string;

  protected override get componentType(): string {
    return 'Pagination';
  }

  constructor(scope: Scope, selector: SelectorLike, options: PaginationOptions = {}) {
    super(scope, selector, options);
    this.nextSelector = options.nextSelector ?? '[aria-label*="next" i], .next';
    this.previousSelector = options.previousSelector ?? '[aria-label*="prev" i], .prev';
    this.firstSelector = options.firstSelector ?? '[aria-label*="first" i], .first';
    this.lastSelector = options.lastSelector ?? '[aria-label*="last" i], .last';
    this.pageSelector = options.pageSelector ?? 'button, a, li';
    this.currentPageSelector =
      options.currentPageSelector ?? '[aria-current="page"], .active, .current';
    this.pageSizeSelector = options.pageSizeSelector ?? 'select';
    this.infoSelector = options.infoSelector ?? '.pagination-info, [data-testid="pagination-info"]';
  }

  async goToNext(): Promise<void> {
    await this.step('go to next page', async () => {
      await this.locator.locator(this.nextSelector).first().click({ timeout: this.timeout });
    });
  }

  async goToPrevious(): Promise<void> {
    await this.step('go to previous page', async () => {
      await this.locator.locator(this.previousSelector).first().click({ timeout: this.timeout });
    });
  }

  async goToFirst(): Promise<void> {
    await this.step('go to first page', async () => {
      const first = this.locator.locator(this.firstSelector).first();
      if ((await first.count()) > 0) await first.click({ timeout: this.timeout });
      else await this.goToPage(1);
    });
  }

  async goToLast(): Promise<void> {
    await this.step('go to last page', async () => {
      const last = this.locator.locator(this.lastSelector).first();
      if ((await last.count()) > 0) await last.click({ timeout: this.timeout });
      else await this.goToPage(await this.getTotalPages());
    });
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.step(`go to page ${pageNumber}`, async () => {
      const page = this.locator
        .locator(this.pageSelector)
        .filter({ hasText: new RegExp(`^\\s*${pageNumber}\\s*$`) })
        .first();
      await page.click({ timeout: this.timeout });
    });
  }

  async getCurrentPage(): Promise<number> {
    const current = this.locator.locator(this.currentPageSelector).first();
    if ((await current.count()) === 0) return 1;
    const text = (await current.innerText()).trim();
    const parsed = Number.parseInt(text, 10);
    return Number.isNaN(parsed) ? 1 : parsed;
  }

  /** Total pages, from the info text ("Page 2 of 7") or the highest page link. */
  async getTotalPages(): Promise<number> {
    const info = this.locator.locator(this.infoSelector).first();
    if ((await info.count()) > 0) {
      const match = (await info.innerText()).match(/of\s+(\d+)/i);
      if (match?.[1]) return Number(match[1]);
    }
    const numbers = (await this.locator.locator(this.pageSelector).allInnerTexts())
      .map((text) => Number.parseInt(text.trim(), 10))
      .filter((value) => !Number.isNaN(value));
    return numbers.length > 0 ? Math.max(...numbers) : 1;
  }

  async setPageSize(size: number | string): Promise<void> {
    await this.step(`set page size ${size}`, async () => {
      await this.locator
        .locator(this.pageSizeSelector)
        .first()
        .selectOption(String(size), { timeout: this.timeout });
    });
  }

  async isNextEnabled(): Promise<boolean> {
    const next = this.locator.locator(this.nextSelector).first();
    const [disabled, ariaDisabled, className] = await Promise.all([
      next.isDisabled().catch(() => false),
      next.getAttribute('aria-disabled'),
      next.getAttribute('class'),
    ]);
    return !disabled && ariaDisabled !== 'true' && !/disabled/i.test(className ?? '');
  }

  async isPreviousEnabled(): Promise<boolean> {
    const previous = this.locator.locator(this.previousSelector).first();
    const [disabled, ariaDisabled, className] = await Promise.all([
      previous.isDisabled().catch(() => false),
      previous.getAttribute('aria-disabled'),
      previous.getAttribute('class'),
    ]);
    return !disabled && ariaDisabled !== 'true' && !/disabled/i.test(className ?? '');
  }

  /** Walks every page, running `onPage` for each. */
  async forEachPage(onPage: (pageNumber: number) => Promise<void>): Promise<void> {
    const total = await this.getTotalPages();
    for (let page = await this.getCurrentPage(); page <= total; page++) {
      await onPage(page);
      if (page < total && (await this.isNextEnabled())) await this.goToNext();
    }
  }
}
