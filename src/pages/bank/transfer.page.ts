import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../../types';
import { VISIBLE_LISTBOX } from './dropdown-panel';

/**
 * Internal transfers between the signed-in user's own accounts.
 *
 * The flow has three distinct screens, and the page object models all three
 * because a test that stops at "the form submitted" has not tested a transfer:
 *
 *   1. the form            → `review-transfer-btn`
 *   2. a confirmation modal → `confirm-transfer-btn`
 *   3. a success page       → reference number and a summary
 */
export class TransferPage extends BasePage {
  protected readonly path = '/bank/transfer';
  protected readonly readyIndicator: SelectorLike = '[data-testid="transfer-form"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  /* Step 1 — the form ----------------------------------------------------- */
  readonly fromAccount;
  readonly toAccount;
  readonly amountInput;
  readonly dateTypeToday;
  readonly dateTypeScheduled;
  readonly reviewButton;
  readonly cancelButton;
  readonly errorMessage;

  /* Step 2 — the confirmation modal --------------------------------------- */
  readonly confirmDialog;
  readonly confirmButton;
  readonly cancelConfirmButton;

  /* Step 3 — the success page --------------------------------------------- */
  readonly successHeading;
  readonly referenceId;
  readonly confirmedFrom;
  readonly confirmedTo;
  readonly confirmedAmount;
  readonly backToDashboardButton;
  readonly anotherTransferButton;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.fromAccount = this.factory.dropdown('[data-testid="transfer-from-select"]', {
      name: 'From account',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[data-testid="transfer-from-option"]',
    });
    this.toAccount = this.factory.dropdown('[data-testid="transfer-to-select"]', {
      name: 'To account',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[data-testid="transfer-to-option"]',
    });
    this.amountInput = this.factory.input('[data-testid="transfer-amount-input"]', {
      name: 'Amount',
    });
    this.dateTypeToday = this.factory.checkbox('[data-testid="date-type-today"]', {
      name: 'Today',
    });
    this.dateTypeScheduled = this.factory.checkbox('[data-testid="date-type-scheduled"]', {
      name: 'Schedule for later',
    });
    this.reviewButton = this.factory.button('[data-testid="review-transfer-btn"]', {
      name: 'Review transfer',
    });
    this.cancelButton = this.factory.button('[data-testid="cancel-transfer-btn"]', {
      name: 'Cancel',
    });
    this.errorMessage = this.factory.alert('[data-testid="transfer-error-message"]', {
      name: 'Transfer error',
    });

    this.confirmDialog = this.factory.modal('[data-testid="transfer-confirm-dialog"]', {
      name: 'Confirm transfer',
      titleSelector: '[data-testid="transfer-confirm-title"]',
      confirmSelector: '[data-testid="confirm-transfer-btn"]',
      cancelSelector: '[data-testid="cancel-confirm-transfer-btn"]',
    });
    this.confirmButton = this.factory.button('[data-testid="confirm-transfer-btn"]', {
      name: 'Confirm',
    });
    this.cancelConfirmButton = this.factory.button('[data-testid="cancel-confirm-transfer-btn"]', {
      name: 'Cancel confirmation',
    });

    this.successHeading = this.factory.card('[data-testid="transfer-success-heading"]', {
      name: 'Success heading',
    });
    this.referenceId = this.factory.card('[data-testid="transfer-ref-id"]', {
      name: 'Reference number',
    });
    this.confirmedFrom = this.factory.card('[data-testid="confirm-from-account"]', {
      name: 'From',
    });
    this.confirmedTo = this.factory.card('[data-testid="confirm-to-account"]', { name: 'To' });
    this.confirmedAmount = this.factory.card('[data-testid="confirm-amount"]', { name: 'Amount' });
    this.backToDashboardButton = this.factory.button('[data-testid="back-to-dashboard-btn"]', {
      name: 'Back to dashboard',
    });
    this.anotherTransferButton = this.factory.button('[data-testid="another-transfer-btn"]', {
      name: 'Make another transfer',
    });
  }

  /* Business actions ------------------------------------------------------ */

  /**
   * Fills the form. Stops short of submitting, so a validation test and a
   * happy-path test can share it.
   *
   * `to` is filled after `from` because the application removes the selected
   * source from the destination list — filling them in the other order picks
   * an option that is about to disappear.
   */
  async fillForm(input: { from?: string; to?: string; amount?: string }): Promise<void> {
    if (input.from) await this.fromAccount.selectOption(input.from);
    if (input.to) await this.toAccount.selectOption(input.to);
    if (input.amount !== undefined) await this.amountInput.type(input.amount);
  }

  /** Submits the form to reach the confirmation modal. */
  async review(): Promise<void> {
    await this.reviewButton.click();
  }

  /**
   * The whole happy path: fill, review, confirm, and land on the success page.
   *
   * Returns the reference number, because that is the one piece of information
   * a caller cannot obtain any other way and is what a follow-up assertion
   * needs.
   */
  async completeTransfer(input: { from: string; to: string; amount: string }): Promise<string> {
    await this.fillForm(input);
    await this.review();
    await this.confirmDialog.waitForOpen();
    await this.confirmButton.click();
    await this.successHeading.waitForVisible();
    return (await this.referenceId.getText()).trim();
  }

  /** The validation message the form is currently showing, or `null`. */
  async validationError(): Promise<string | null> {
    if ((await this.errorMessage.count()) === 0) return null;
    return (await this.errorMessage.getText()).trim();
  }

  /** The "Available: $X" hint under the amount field, as a number. */
  async availableBalance(): Promise<number> {
    const text = await this.page
      .locator('[data-testid="transfer-form"]')
      .getByText(/Available:/i)
      .innerText();
    return Number(text.replace(/[^0-9.]/g, ''));
  }
}
