import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../../types';
import { VISIBLE_LISTBOX } from './dropdown-panel';

/** Bill payment: pick a biller, an amount and a date. */
export class BillPayPage extends BasePage {
  protected readonly path = '/bank/bill-pay';
  protected readonly readyIndicator: SelectorLike = '[data-testid="bill-pay-form"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  readonly fromAccount;
  readonly addBillerButton;
  /**
   * The biller field is a **search box**, not a dropdown — typing filters a
   * list of billers. Modelled as an Autocomplete so the type-filter-select
   * sequence comes from the component rather than being rebuilt per test.
   */
  readonly billerSearch;
  readonly amountInput;
  readonly paymentDateInput;
  readonly memoInput;
  readonly reviewButton;
  readonly cancelButton;

  readonly addBillerDialog;
  readonly billerNameInput;
  /**
   * The account/reference number.
   *
   * Carries **no `data-testid`** and — verified against the running
   * application — **no associated `<label>` either**, so `getByLabel` cannot
   * find it. That is an accessibility gap in the application: a screen reader
   * announces an unlabelled text box.
   *
   * Located by placeholder, which is the only user-visible anchor available.
   * Placeholder text is a weaker locator than a label (it is a hint, not a
   * name, and it disappears on input) — using it here is a compromise forced
   * by the markup, and the accessibility suite records the underlying gap.
   */
  readonly billerReferenceInput;
  readonly saveBillerButton;
  readonly cancelBillerButton;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.fromAccount = this.factory.dropdown('[data-testid="bill-pay-from-select"]', {
      name: 'From account',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[data-testid="bill-pay-from-option"]',
    });
    this.addBillerButton = this.factory.button('[data-testid="add-biller-btn"]', {
      name: 'Add biller',
    });
    this.billerSearch = this.factory.autocomplete('[data-testid="biller-search-input"]', {
      name: 'Biller',
      suggestionItemSelector: '[data-testid="biller-option"]',
    });
    this.amountInput = this.factory.input('[data-testid="bill-amount-input"]', { name: 'Amount' });
    /*
     * A native `<input type="date">` with a `min` of today, so the browser
     * itself refuses a past date.
     *
     * Modelled as a TextInput rather than a DatePicker: the DatePicker
     * component drives a *custom* calendar widget by clicking through months,
     * which this control does not have. A native date input is set by writing
     * its `yyyy-mm-dd` value, and TextInput is the component that does that.
     * Using the fancier component here would be reaching for the wrong tool
     * because of its name.
     */
    this.paymentDateInput = this.factory.input('[data-testid="bill-payment-date-input"]', {
      name: 'Payment date',
    });
    this.memoInput = this.factory.input('[data-testid="bill-memo-input"]', { name: 'Memo' });
    this.reviewButton = this.factory.button('[data-testid="review-bill-btn"]', {
      name: 'Review payment',
    });
    this.cancelButton = this.factory.button('[data-testid="cancel-bill-btn"]', { name: 'Cancel' });

    this.addBillerDialog = this.factory.modal('[data-testid="add-biller-dialog"]', {
      name: 'Add biller',
      titleSelector: '[data-testid="add-biller-dialog-title"]',
      confirmSelector: '[data-testid="save-add-biller-btn"]',
      cancelSelector: '[data-testid="cancel-add-biller-btn"]',
    });
    this.billerNameInput = this.factory.input('[data-testid="add-biller-name-input"]', {
      name: 'Biller name',
    });
    this.billerReferenceInput = this.factory.input(
      page.getByTestId('add-biller-dialog').getByPlaceholder(/ACC-/i),
      { name: 'Account / reference number' },
    );
    this.saveBillerButton = this.factory.button('[data-testid="save-add-biller-btn"]', {
      name: 'Save biller',
    });
    this.cancelBillerButton = this.factory.button('[data-testid="cancel-add-biller-btn"]', {
      name: 'Cancel',
    });
  }

  /**
   * Adds a biller through the dialog.
   *
   * Both fields are required. An earlier version filled only the name and the
   * dialog simply never closed — the application was rejecting the submission
   * and the test was waiting for a close that would never come.
   */
  async addBiller(
    name: string,
    reference = `REF-${Date.now().toString().slice(-8)}`,
  ): Promise<void> {
    await this.addBillerButton.click();
    await this.addBillerDialog.waitForOpen();
    await this.billerNameInput.type(name);
    await this.billerReferenceInput.type(reference);
    await this.saveBillerButton.click();
    await this.addBillerDialog.waitForClose();
  }

  /** A date `days` in the future, in the `yyyy-mm-dd` a date input requires. */
  static futureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
