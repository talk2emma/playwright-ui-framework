/**
 * ===========================================================================
 * Send Money and Bill Pay — covers TC-SEND-001..006 and TC-BILL-001..006
 * ===========================================================================
 *
 * Two external payment flows in one file, because they share a shape: pick a
 * source account, pick or create a recipient, enter an amount, review.
 * Splitting them would duplicate the reasoning without separating anything.
 */
import { test, expect } from '../../src/fixtures';
import { SEED } from '../../src/data/personas';
import { BillPayPage } from '../../src/pages/bank';

const CHECKING = SEED.accounts[0].name;

test.describe('send money @regression @send-money', () => {
  test('TC-SEND-001 — the form loads with a payee selector @smoke', async ({ signedIn }) => {
    await signedIn.sendMoney.goto();
    await signedIn.sendMoney.expectLoaded();

    await expect(signedIn.sendMoney.fromAccount.locator).toBeVisible();
    await expect(signedIn.sendMoney.payee.locator).toBeVisible();
    await expect(signedIn.sendMoney.addPayeeButton.locator).toBeEnabled();
    await expect(signedIn.sendMoney.amountInput.locator).toBeVisible();
  });

  test('TC-SEND-002 — the add-payee dialog opens with its fields', async ({ signedIn }) => {
    await signedIn.sendMoney.goto();
    await signedIn.sendMoney.addPayeeButton.click();
    await signedIn.sendMoney.addPayeeDialog.waitForOpen();

    /* Four fields, all required by a real bank transfer: who, which bank, and
     * the two numbers that route the money. */
    await expect(signedIn.sendMoney.payeeNameInput.locator).toBeVisible();
    await expect(signedIn.sendMoney.payeeBankInput.locator).toBeVisible();
    await expect(signedIn.sendMoney.payeeRoutingInput.locator).toBeVisible();
    await expect(signedIn.sendMoney.payeeAccountInput.locator).toBeVisible();

    await signedIn.sendMoney.addPayeeDialog.closeWithEscape();
    expect(await signedIn.sendMoney.addPayeeDialog.isOpen()).toBe(false);
  });

  test('TC-SEND-004 — a new payee is saved and becomes selectable', async ({ signedIn }) => {
    await signedIn.sendMoney.goto();

    /* A generated name so the test never collides with itself, and so a
     * re-run does not depend on what a previous run left behind. */
    const name = `Jamie Probe ${Date.now().toString().slice(-6)}`;
    await signedIn.sendMoney.addPayee({
      name,
      bank: 'First National',
      routing: '021000021',
      account: '12345678',
    });
    await signedIn.sendMoney.addPayeeDialog.waitForClose();

    /* The point of saving a payee is that it appears next time — asserting the
     * dialog closed would prove nothing at all. */
    await signedIn.sendMoney.payee.open();
    const payees = await signedIn.sendMoney.payee.optionsLocator.allInnerTexts();
    expect(payees.join(' ')).toContain(name);
  });

  test('TC-SEND-006 — a frozen account cannot send money @negative', async ({ signInAs }) => {
    const bank = await signInAs('frozen');
    await bank.sendMoney.goto();

    expect(await bank.sendMoney.isBlocked()).toBe(true);
    await expect(bank.sendMoney.page.locator('[data-testid="bank-main-content"]')).toContainText(
      /frozen/i,
    );
  });

  test('the note field accepts free text', async ({ signedIn }) => {
    await signedIn.sendMoney.goto();
    await signedIn.sendMoney.noteInput.type('Rent — September');

    /* Round-tripping the value proves the field is bound, not decorative. */
    expect(await signedIn.sendMoney.noteInput.getValue()).toBe('Rent — September');
  });
});

test.describe('bill pay @regression @bill-pay', () => {
  test('TC-BILL-001 — the form loads with biller selection @smoke', async ({ signedIn }) => {
    await signedIn.billPay.goto();
    await signedIn.billPay.expectLoaded();

    await expect(signedIn.billPay.fromAccount.locator).toBeVisible();
    await expect(signedIn.billPay.billerSearch.locator).toBeVisible();
    await expect(signedIn.billPay.amountInput.locator).toBeVisible();
    await expect(signedIn.billPay.paymentDateInput.locator).toBeVisible();
  });

  test('TC-BILL-003 — a new biller can be added', async ({ signedIn }) => {
    await signedIn.billPay.goto();

    const name = `Probe Utilities ${Date.now().toString().slice(-6)}`;
    await signedIn.billPay.addBiller(name);

    /* Searching for it is the assertion — a biller that saves but cannot be
     * found again has not been added in any useful sense. */
    await signedIn.billPay.billerSearch.search(name.slice(0, 12));
    await expect(signedIn.billPay.page.locator('[data-testid="bill-pay-form"]')).toContainText(
      name.slice(0, 12),
    );
  });

  test('TC-BILL-005 — a payment can be dated in the future', async ({ signedIn }) => {
    await signedIn.billPay.goto();

    const future = BillPayPage.futureDate(14);
    await signedIn.billPay.paymentDateInput.type(future);

    /* A native date input round-trips `yyyy-mm-dd`; asserting the value is how
     * you know the field accepted the date rather than silently rejecting it. */
    expect(await signedIn.billPay.paymentDateInput.getValue()).toBe(future);
  });

  test('the payment date field is a real date input', async ({ signedIn }) => {
    await signedIn.billPay.goto();

    /* `type="date"` is what gives a mobile user a date picker instead of a
     * keyboard, and what stops "next tuesday" being submitted. */
    expect(await signedIn.billPay.paymentDateInput.getInputType()).toBe('date');
  });

  test('a frozen account cannot pay a bill @negative', async ({ signInAs }) => {
    const bank = await signInAs('frozen');
    await bank.billPay.goto();

    await expect(bank.billPay.reviewButton.locator).toBeDisabled();
  });

  test('the from-account dropdown lists the signed-in accounts', async ({ signedIn }) => {
    await signedIn.billPay.goto();
    await signedIn.billPay.fromAccount.open();

    const options = await signedIn.billPay.fromAccount.optionsLocator.allInnerTexts();
    expect(options).toHaveLength(SEED.accounts.length);
    expect(options.join(' ')).toContain(CHECKING);
  });
});
