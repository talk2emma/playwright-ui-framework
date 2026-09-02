import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import { parseCurrency } from './dashboard.page';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../../types';

/**
 * A single account's page: balance plus a filterable, sortable transaction
 * table.
 *
 * Its `path` carries an account id, so `goto()` is not used — the page is
 * reached by clicking through from the accounts list, which is how a user
 * reaches it and therefore what should be tested.
 */
export class AccountDetailPage extends BasePage {
  protected readonly path = '/bank/accounts';
  protected readonly readyIndicator: SelectorLike = '[data-testid="account-detail-page"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  readonly backLink;
  readonly accountName;
  readonly accountTypeBadge;
  readonly accountBalance;

  readonly searchInput;
  readonly dateFromInput;
  readonly dateToInput;
  readonly typeFilter;
  readonly transactionsTable;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.backLink = this.factory.link('[data-testid="back-to-accounts-link"]', {
      name: 'Back to accounts',
    });
    this.accountName = this.factory.card('[data-testid="account-detail-name"]', { name: 'Name' });
    this.accountTypeBadge = this.factory.card('[data-testid="account-detail-type-badge"]', {
      name: 'Type',
    });
    this.accountBalance = this.factory.card('[data-testid="account-detail-balance"]', {
      name: 'Balance',
    });

    this.searchInput = this.factory.input('[data-testid="txn-search-input"]', { name: 'Search' });
    this.dateFromInput = this.factory.datePicker('[data-testid="txn-date-from-input"]', {
      name: 'From date',
    });
    this.dateToInput = this.factory.datePicker('[data-testid="txn-date-to-input"]', {
      name: 'To date',
    });
    this.typeFilter = this.factory.radioGroup('[data-testid="txn-type-filter"]', {
      name: 'Transaction type',
    });
    this.transactionsTable = this.factory.table('[data-testid="transactions-table"]', {
      name: 'Transactions',
      rowSelector: '[data-testid="transaction-row"]',
    });
  }

  async balance(): Promise<number> {
    return parseCurrency(await this.accountBalance.getText());
  }

  /** Types into the search field and waits for the debounce to settle. */
  async search(term: string): Promise<void> {
    await this.searchInput.typeAndSettle(term);
  }

  /** Descriptions of every visible transaction row. */
  async descriptions(): Promise<string[]> {
    return this.page.locator('[data-testid="txn-description"]').allInnerTexts();
  }
}
