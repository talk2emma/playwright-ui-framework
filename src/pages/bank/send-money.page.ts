import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../../types';
import { VISIBLE_LISTBOX } from './dropdown-panel';

/** External payments to a saved payee, plus the "add payee" dialog. */
export class SendMoneyPage extends BasePage {
  protected readonly path = '/bank/send-money';
  protected readonly readyIndicator: SelectorLike = '[data-testid="send-money-form"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  readonly fromAccount;
  readonly payee;
  readonly addPayeeButton;
  readonly amountInput;
  readonly noteInput;
  readonly reviewButton;
  readonly cancelButton;

  /* The add-payee dialog, whose validation is the interesting part. */
  readonly addPayeeDialog;
  readonly payeeNameInput;
  readonly payeeBankInput;
  readonly payeeRoutingInput;
  readonly payeeAccountInput;
  readonly savePayeeButton;
  readonly cancelPayeeButton;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.fromAccount = this.factory.dropdown('[data-testid="send-from-account-select"]', {
      name: 'From account',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[data-testid="send-from-option"]',
    });
    this.payee = this.factory.dropdown('[data-testid="payee-select"]', {
      name: 'Payee',
      panelSelector: VISIBLE_LISTBOX,
      optionSelector: '[data-testid="payee-select-option"]',
    });
    this.addPayeeButton = this.factory.button('[data-testid="add-payee-btn"]', {
      name: 'Add payee',
    });
    this.amountInput = this.factory.input('[data-testid="send-amount-input"]', { name: 'Amount' });
    this.noteInput = this.factory.input('[data-testid="send-note-input"]', { name: 'Note' });
    this.reviewButton = this.factory.button('[data-testid="review-send-btn"]', {
      name: 'Review send',
    });
    this.cancelButton = this.factory.button('[data-testid="cancel-send-btn"]', { name: 'Cancel' });

    this.addPayeeDialog = this.factory.modal('[data-testid="add-payee-dialog"]', {
      name: 'Add payee',
      titleSelector: '[data-testid="add-payee-dialog-title"]',
      confirmSelector: '[data-testid="save-add-payee-btn"]',
      cancelSelector: '[data-testid="cancel-add-payee-btn"]',
    });
    this.payeeNameInput = this.factory.input('[data-testid="add-payee-name-input"]', {
      name: 'Payee name',
    });
    this.payeeBankInput = this.factory.input('[data-testid="add-payee-bank-input"]', {
      name: 'Bank',
    });
    this.payeeRoutingInput = this.factory.input('[data-testid="add-payee-routing-input"]', {
      name: 'Routing number',
    });
    this.payeeAccountInput = this.factory.input('[data-testid="add-payee-account-input"]', {
      name: 'Account number',
    });
    this.savePayeeButton = this.factory.button('[data-testid="save-add-payee-btn"]', {
      name: 'Save payee',
    });
    this.cancelPayeeButton = this.factory.button('[data-testid="cancel-add-payee-btn"]', {
      name: 'Cancel',
    });
  }

  /** Opens the dialog, fills it and saves. Returns without asserting. */
  async addPayee(input: {
    name: string;
    bank: string;
    routing: string;
    account: string;
  }): Promise<void> {
    await this.addPayeeButton.click();
    await this.addPayeeDialog.waitForOpen();
    await this.payeeNameInput.type(input.name);
    await this.payeeBankInput.type(input.bank);
    await this.payeeRoutingInput.type(input.routing);
    await this.payeeAccountInput.type(input.account);
    await this.savePayeeButton.click();
  }

  /** Whether money movement is blocked — true for the frozen persona. */
  async isBlocked(): Promise<boolean> {
    return this.reviewButton.isDisabled();
  }
}
