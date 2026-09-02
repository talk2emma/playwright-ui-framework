import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import { parseCurrency } from './dashboard.page';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../../types';
import { VISIBLE_LISTBOX } from './dropdown-panel';

/**
 * Loan applications and their history.
 *
 * This page carries the application's **planted defect**: for `error_user`,
 * the history total omits the most recently added loan. That is deliberate on
 * the application's part, and the suite reproduces it rather than working
 * around it — a test framework that cannot demonstrate finding a real bug has
 * not been demonstrated at all.
 */
export class ApplyLoanPage extends BasePage {
  protected readonly path = '/bank/apply-loan';
  protected readonly readyIndicator: SelectorLike = '[data-testid="apply-loan-page"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  readonly openApplyLoanButton;
  readonly resetDataButton;

  /* The application dialog. */
  readonly loanDialog;
  readonly loanTypeDropdown;
  readonly loanAmountInput;
  readonly loanTermDropdown;
  readonly interestRateInput;
  readonly loanAccountDropdown;
  readonly reviewLoanButton;
  readonly cancelLoanButton;

  /* History. */
  readonly historyTable;
  readonly historySearch;
  readonly historyTypeFilter;
  readonly historyDateFrom;
  readonly historyDateTo;
  readonly historyTotal;
  readonly historyPagination;
  readonly historyPaginationInfo;
  readonly historyNextButton;
  readonly historyPreviousButton;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.openApplyLoanButton = this.factory.button('[data-testid="open-apply-loan-btn"]', {
      name: 'Apply for a loan',
    });
    this.resetDataButton = this.factory.button('[data-testid="reset-data-btn"]', {
      name: 'Reset data',
    });

    this.loanDialog = this.factory.modal('[data-testid="apply-loan-dialog"]', {
      name: 'Apply for a loan',
      titleSelector: '[data-testid="apply-loan-dialog-title"]',
      confirmSelector: '[data-testid="review-loan-btn"]',
      cancelSelector: '[data-testid="cancel-loan-btn"]',
    });
    this.loanTypeDropdown = this.factory.dropdown('[data-testid="loan-type-select"]', {
      name: 'Loan type',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[data-testid="loan-type-option"]',
    });
    this.loanAmountInput = this.factory.input('[data-testid="loan-amount-input"]', {
      name: 'Loan amount',
    });
    this.loanTermDropdown = this.factory.dropdown('[data-testid="loan-term-select"]', {
      name: 'Term',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[role="option"]',
    });
    this.interestRateInput = this.factory.input('[data-testid="loan-interest-rate-input"]', {
      name: 'Interest rate',
    });
    this.loanAccountDropdown = this.factory.dropdown('[data-testid="loan-account-select"]', {
      name: 'Deposit account',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[role="option"]',
    });
    this.reviewLoanButton = this.factory.button('[data-testid="review-loan-btn"]', {
      name: 'Review loan',
    });
    this.cancelLoanButton = this.factory.button('[data-testid="cancel-loan-btn"]', {
      name: 'Cancel',
    });

    this.historyTable = this.factory.table('[data-testid="loan-history-table"]', {
      name: 'Loan history',
      rowSelector: '[data-testid="loan-history-row"]',
    });
    this.historySearch = this.factory.input('[data-testid="loan-search-input"]', {
      name: 'Search loans',
    });
    this.historyTypeFilter = this.factory.dropdown('[data-testid="loan-type-filter-select"]', {
      name: 'Loan type filter',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[role="option"]',
    });
    this.historyDateFrom = this.factory.datePicker('[data-testid="loan-date-from-input"]', {
      name: 'From date',
    });
    this.historyDateTo = this.factory.datePicker('[data-testid="loan-date-to-input"]', {
      name: 'To date',
    });
    this.historyTotal = this.factory.card('[data-testid="loan-history-total-value"]', {
      name: 'History total',
    });
    this.historyPagination = this.factory.pagination(
      '[data-testid="loan-history-pagination-controls"]',
      {
        name: 'Loan history pagination',
        nextSelector: '[data-testid="loan-history-pagination-next"]',
        previousSelector: '[data-testid="loan-history-pagination-prev"]',
      },
    );
    this.historyPaginationInfo = this.factory.card('[data-testid="loan-history-pagination-info"]', {
      name: 'Loan history pagination info',
    });
    this.historyNextButton = this.factory.button('[data-testid="loan-history-pagination-next"]', {
      name: 'Next page',
    });
    this.historyPreviousButton = this.factory.button(
      '[data-testid="loan-history-pagination-prev"]',
      { name: 'Previous page' },
    );
  }

  /** Opens the application dialog. */
  async openApplication(): Promise<void> {
    await this.openApplyLoanButton.click();
    await this.loanDialog.waitForOpen();
  }

  /** Fills the dialog without submitting, so validation can be asserted. */
  async fillApplication(input: {
    type?: string;
    amount?: string;
    term?: string;
    account?: string;
  }): Promise<void> {
    if (input.type) await this.loanTypeDropdown.selectOption(input.type);
    if (input.amount !== undefined) await this.loanAmountInput.type(input.amount);
    if (input.term) await this.loanTermDropdown.selectOption(input.term);
    if (input.account) await this.loanAccountDropdown.selectOption(input.account);
  }

  /** The amounts on the CURRENT page of history, parsed. */
  async historyAmounts(): Promise<number[]> {
    const texts = await this.page.locator('[data-testid="loan-history-amount"]').allInnerTexts();
    return texts.map(parseCurrency);
  }

  /**
   * Every loan across every page, with its status.
   *
   * The history paginates at five rows, and the total beneath it is labelled
   * **"Total (Active/Pending)"** — it covers all loans but counts only the
   * ones that are not closed. So comparing the total against the visible page
   * is wrong twice over: it misses later pages and it includes closed loans.
   *
   * An earlier version of the loan test did exactly that and reported a
   * mismatch for a perfectly healthy account. Walking the pages and filtering
   * by status is what makes the comparison mean something.
   */
  async allHistoryRows(): Promise<{ amount: number; status: string }[]> {
    const rows: { amount: number; status: string }[] = [];

    for (let guard = 0; guard < 50; guard += 1) {
      const onPage = this.page.locator('[data-testid="loan-history-row"]');
      const count = await onPage.count();

      for (let index = 0; index < count; index += 1) {
        const row = onPage.nth(index);
        rows.push({
          amount: parseCurrency(
            await row.locator('[data-testid="loan-history-amount"]').innerText(),
          ),
          status: (
            await row.locator('[data-testid="loan-history-status-badge"]').innerText()
          ).trim(),
        });
      }

      if (!(await this.historyNextButton.isEnabled().catch(() => false))) break;
      await this.historyNextButton.click();
      await this.waitForIdle();
    }
    return rows;
  }

  /**
   * The figure the displayed total is supposed to equal: every loan that is
   * not closed, summed across all pages.
   */
  async expectedActiveTotal(): Promise<number> {
    const rows = await this.allHistoryRows();
    return rows
      .filter((row) => !/closed/i.test(row.status))
      .reduce((sum, row) => sum + row.amount, 0);
  }

  /** The total the page displays beneath the history table. */
  async displayedTotal(): Promise<number> {
    return parseCurrency(await this.historyTotal.getText());
  }

  /** How many loan rows are on the current page. */
  async historyRowCount(): Promise<number> {
    return this.page.locator('[data-testid="loan-history-row"]').count();
  }

  /**
   * Restores the seeded dataset.
   *
   * Not needed for isolation — every test gets a fresh browser context and the
   * application stores its state in `localStorage`, so state never leaks
   * between tests. It is here for the human who has been clicking around in a
   * headed debugging session and wants a clean slate.
   */
  async resetData(): Promise<void> {
    await this.resetDataButton.click();
    await this.waitForIdle();
  }
}
