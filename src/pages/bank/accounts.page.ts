import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import { parseCurrency } from './dashboard.page';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../../types';
import { VISIBLE_LISTBOX } from './dropdown-panel';

/** The account list, plus the add/edit dialog it opens. */
export class AccountsPage extends BasePage {
  protected readonly path = '/bank/accounts';
  protected readonly readyIndicator: SelectorLike = '[data-testid="accounts-page"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  readonly pageTitle;
  readonly addAccountButton;
  readonly accountsTable;

  /**
   * The add/edit dialog.
   *
   * One component for both, because the application reuses the same form and
   * only changes the container's test id and the title. Two nearly identical
   * page-object members would have to be kept in step for no benefit.
   */
  readonly accountDialog;
  readonly accountNameInput;
  readonly accountTypeDropdown;
  readonly startingBalanceInput;
  readonly acceptTermsCheckbox;
  readonly saveAccountButton;
  readonly cancelAccountButton;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.pageTitle = this.factory.card('[data-testid="accounts-page-title"]', {
      name: 'Page title',
    });
    this.addAccountButton = this.factory.button('[data-testid="add-account-btn"]', {
      name: 'Add account',
    });
    this.accountsTable = this.factory.table('[data-testid="accounts-table"]', {
      name: 'Accounts',
      rowSelector: '[data-testid="account-row"]',
    });

    this.accountDialog = this.factory.modal(
      '[data-testid="add-account-dialog"], [data-testid="edit-account-dialog"]',
      {
        name: 'Account form',
        titleSelector: '[data-testid="account-form-dialog-title"]',
        confirmSelector: '[data-testid="save-account-form-btn"]',
        cancelSelector: '[data-testid="cancel-account-form-btn"]',
      },
    );
    this.accountNameInput = this.factory.input('[data-testid="account-form-name-input"]', {
      name: 'Account name',
    });
    /* A custom listbox, not a native <select>: the trigger is a button with
     * role="combobox" and the panel is a sibling div. The Dropdown component
     * is told exactly where both live rather than guessing. */
    this.accountTypeDropdown = this.factory.dropdown('[data-testid="account-form-type-select"]', {
      name: 'Account type',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[data-testid="account-form-type-option"]',
    });
    /*
     * The starting-balance field is the one control in this dialog with **no
     * `data-testid`** — it carries only a generated id (`base-ui-_r_a_`) that
     * changes between renders and must never be selected on.
     *
     * So it is located by its placeholder, scoped to the dialog. That is not a
     * fallback for its own sake: a placeholder is user-visible text, which
     * makes it a more meaningful anchor than a generated id, and scoping to
     * the dialog keeps it unambiguous.
     */
    this.startingBalanceInput = this.factory.input(
      page.getByTestId('add-account-dialog').getByPlaceholder('0.00'),
      { name: 'Starting balance' },
    );
    /* A `span[role="checkbox"]`, not a native input. The Checkbox component
     * already handles that: `check()` falls back to a click when Playwright's
     * strict `check()` refuses a non-input element. */
    this.acceptTermsCheckbox = this.factory.checkbox(
      '[data-testid="account-form-accept-terms-checkbox"]',
      { name: 'Accept terms' },
    );
    this.saveAccountButton = this.factory.button('[data-testid="save-account-form-btn"]', {
      name: 'Save account',
    });
    this.cancelAccountButton = this.factory.button('[data-testid="cancel-account-form-btn"]', {
      name: 'Cancel',
    });
  }

  /** Account names in display order. */
  async accountNames(): Promise<string[]> {
    return this.page.locator('[data-testid="account-row-name"]').allInnerTexts();
  }

  /** Every account's name and balance, parsed. */
  async accounts(): Promise<{ name: string; balance: number }[]> {
    const rows = this.page.locator('[data-testid="account-row"]');
    const count = await rows.count();
    const out: { name: string; balance: number }[] = [];

    for (let index = 0; index < count; index += 1) {
      const row = rows.nth(index);
      out.push({
        name: (await row.locator('[data-testid="account-row-name"]').innerText()).trim(),
        balance: parseCurrency(
          await row.locator('[data-testid="account-row-balance"]').innerText(),
        ),
      });
    }
    return out;
  }

  /** Sum of every account balance — the figure the dashboard should agree with. */
  async totalBalance(): Promise<number> {
    const accounts = await this.accounts();
    return accounts.reduce((total, account) => total + account.balance, 0);
  }

  /** Opens the detail page for an account by its displayed name. */
  async openAccount(name: string): Promise<void> {
    const row = this.page.locator('[data-testid="account-row"]').filter({ hasText: name }).first();
    await row.locator('[data-testid="view-account-btn"]').click();
    await this.page.waitForURL(/\/bank\/accounts\/.+/, { timeout: 15_000 });
  }

  /** Opens the edit dialog for an account by its displayed name. */
  async editAccount(name: string): Promise<void> {
    const row = this.page.locator('[data-testid="account-row"]').filter({ hasText: name }).first();
    await row.locator('[data-testid="edit-account-btn"]').click();
    await this.accountDialog.waitForOpen();
  }

  /**
   * Creates an account through the dialog.
   *
   * Every field here is **required**, which was established by submitting an
   * incomplete form and reading the messages the application returned — first
   * "Please select an account type", then "Please enter a valid starting
   * balance". A page object that only filled the name would fail with a
   * dialog that never closes, and the cause would not be obvious.
   *
   * The terms checkbox exists only on *create*, not on edit, so it is checked
   * conditionally — an unconditional `check()` would break the edit flow.
   */
  async addAccount(input: {
    name: string;
    type?: string;
    startingBalance?: string;
  }): Promise<void> {
    await this.addAccountButton.click();
    await this.accountDialog.waitForOpen();

    await this.accountNameInput.type(input.name);
    await this.accountTypeDropdown.selectOption(input.type ?? 'Savings');
    await this.startingBalanceInput.type(input.startingBalance ?? '100.00');
    if ((await this.acceptTermsCheckbox.count()) > 0) await this.acceptTermsCheckbox.check();

    await this.saveAccountButton.click();
    await this.accountDialog.waitForClose();
  }
}
