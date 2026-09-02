import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../../types';
import { VISIBLE_LISTBOX } from './dropdown-panel';

/**
 * All activity across every account: search, filter, sort, paginate, export.
 *
 * The richest page in the application, and the one that exercises the most of
 * the component library in a single place.
 */
export class TransactionsPage extends BasePage {
  protected readonly path = '/bank/transactions';
  protected readonly readyIndicator: SelectorLike = '[data-testid="transactions-page"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  readonly searchInput;
  readonly accountFilter;
  readonly typeFilter;
  readonly table;
  readonly pagination;
  readonly paginationInfo;
  readonly previousPageButton;
  readonly nextPageButton;
  readonly downloadButton;
  readonly emptyMessage;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.searchInput = this.factory.input('[data-testid="all-txn-search-input"]', {
      name: 'Search transactions',
    });
    this.accountFilter = this.factory.dropdown('[data-testid="all-txn-account-select"]', {
      name: 'Account filter',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[data-testid="all-txn-account-option"]',
    });
    /* A segmented control (`div[role="group"]` of buttons), not a radio group
     * in the HTML sense — but it behaves as one, so RadioGroup models it. */
    this.typeFilter = this.factory.radioGroup('[data-testid="all-txn-type-filter"]', {
      name: 'Type filter',
    });
    this.table = this.factory.table('[data-testid="all-transactions-table"]', {
      name: 'All transactions',
      rowSelector: '[data-testid="all-txn-row"]',
    });
    this.pagination = this.factory.pagination('[data-testid="all-txn-pagination-controls"]', {
      name: 'Pagination',
      nextSelector: '[data-testid="all-txn-pagination-next"]',
      previousSelector: '[data-testid="all-txn-pagination-prev"]',
    });
    this.paginationInfo = this.factory.card('[data-testid="all-txn-pagination-info"]', {
      name: 'Pagination info',
    });
    this.previousPageButton = this.factory.button('[data-testid="all-txn-pagination-prev"]', {
      name: 'Previous page',
    });
    this.nextPageButton = this.factory.button('[data-testid="all-txn-pagination-next"]', {
      name: 'Next page',
    });
    this.downloadButton = this.factory.button('[data-testid="download-all-transactions-btn"]', {
      name: 'Download CSV',
    });
    this.emptyMessage = this.factory.alert('[data-testid="no-all-transactions-message"]', {
      name: 'Empty state',
    });
  }

  /** Types into search and waits for the debounce. */
  async search(term: string): Promise<void> {
    await this.searchInput.typeAndSettle(term);
  }

  /** Descriptions of every row currently displayed. */
  async descriptions(): Promise<string[]> {
    return this.page.locator('[data-testid="all-txn-description"]').allInnerTexts();
  }

  /** Dates of every row currently displayed, as text. */
  async dates(): Promise<string[]> {
    return this.page.locator('[data-testid="all-txn-date"]').allInnerTexts();
  }

  /** Amounts of every row, parsed — sign included. */
  async amounts(): Promise<number[]> {
    const texts = await this.page.locator('[data-testid="all-txn-amount"]').allInnerTexts();
    return texts.map((text) => {
      const value = Number(text.replace(/[^0-9.]/g, ''));
      return text.trim().startsWith('-') ? -value : value;
    });
  }

  /** Clicks a sortable column header by its slug. */
  async sortBy(column: 'date' | 'category' | 'amount'): Promise<void> {
    await this.page.locator(`[data-testid="all-txn-sort-${column}-header"]`).click();
    await this.waitForIdle();
  }

  /**
   * Parses "Showing 1–10 of 20" into numbers.
   *
   * The dash is an **en dash**, not a hyphen — matching on `-` silently
   * returns nothing, which is the sort of thing that costs an afternoon.
   */
  async paginationState(): Promise<{ from: number; to: number; total: number }> {
    const text = await this.paginationInfo.getText();
    const match = /(\d+)\s*[–-]\s*(\d+)\s+of\s+(\d+)/.exec(text);
    if (!match) throw new Error(`Could not parse pagination info from "${text}".`);
    return { from: Number(match[1]), to: Number(match[2]), total: Number(match[3]) };
  }

  /** True when the "no transactions match" message is showing. */
  async isEmpty(): Promise<boolean> {
    return (await this.emptyMessage.count()) > 0;
  }
}
