/**
 * ===========================================================================
 * Internal transfers — covers TC-XFER-001..006
 * ===========================================================================
 *
 * The most valuable suite in the repository, because a transfer is the one
 * action in a banking application that moves real money and has to be right in
 * three separate places: the form's validation, the confirmation step, and the
 * balances afterwards.
 *
 * The flow has three screens, and the tests below assert at all three. A test
 * that stopped at "the form submitted" would not have tested a transfer.
 */
import { test, expect } from '../../src/fixtures';
import { SEED } from '../../src/data/personas';

const CHECKING = SEED.accounts[0].name;
const SAVINGS = SEED.accounts[1].name;

test.describe('transfers @regression @transfer', () => {
  test('TC-XFER-001 — the form loads with both account dropdowns @smoke', async ({ signedIn }) => {
    await signedIn.transfer.goto();
    await signedIn.transfer.expectLoaded();

    await expect(signedIn.transfer.fromAccount.locator).toBeVisible();
    await expect(signedIn.transfer.toAccount.locator).toBeVisible();
    await expect(signedIn.transfer.amountInput.locator).toBeVisible();

    /* The dropdowns are custom listboxes, so `role="combobox"` and
     * `aria-expanded` are what make them usable with a keyboard and a screen
     * reader. Worth asserting: it is invisible to a click-only test. */
    await expect(signedIn.transfer.fromAccount.locator).toHaveAttribute('role', 'combobox');
    await expect(signedIn.transfer.fromAccount.locator).toHaveAttribute('aria-expanded', 'false');
  });

  test('the from-dropdown opens, lists the accounts and closes on Escape', async ({ signedIn }) => {
    await signedIn.transfer.goto();

    await signedIn.transfer.fromAccount.open();
    expect(await signedIn.transfer.fromAccount.isOpen()).toBe(true);

    const options = await signedIn.transfer.fromAccount.optionsLocator.allInnerTexts();
    expect(options).toHaveLength(SEED.accounts.length);
    expect(options.join(' ')).toContain(CHECKING);

    await signedIn.transfer.fromAccount.close();
    expect(await signedIn.transfer.fromAccount.isOpen()).toBe(false);
  });

  test('TC-XFER-002 — the destination list excludes the chosen source @negative', async ({
    signedIn,
  }) => {
    await signedIn.transfer.goto();
    await signedIn.transfer.fromAccount.selectOption(CHECKING);

    await signedIn.transfer.toAccount.open();
    const destinations = await signedIn.transfer.toAccount.optionsLocator.allInnerTexts();

    /*
     * The application prevents a same-account transfer *structurally* — by
     * removing the source from the destination list — rather than by
     * validating after the fact. That is a better design, and asserting the
     * mechanism the app actually uses is more honest than forcing an invalid
     * selection to produce an error message that never appears.
     */
    expect(destinations).toHaveLength(SEED.accounts.length - 1);
    expect(destinations.join(' ')).not.toContain(CHECKING);
  });

  test('TC-XFER-003 — an incomplete transfer is refused with a message @negative', async ({
    signedIn,
  }) => {
    await signedIn.transfer.goto();
    await signedIn.transfer.fillForm({ from: CHECKING, amount: '999999' });
    await signedIn.transfer.review();

    const error = await signedIn.transfer.validationError();
    expect(error, 'submitting without a destination must be refused').toBeTruthy();
    expect(error).toMatch(/select a To account/i);

    /* And the confirmation modal must NOT have opened — a validation message
     * that appears alongside a confirmable transfer would be worse than none. */
    expect(await signedIn.transfer.confirmDialog.isOpen()).toBe(false);
  });

  test('TC-XFER-004 — a valid transfer completes and issues a reference @smoke', async ({
    signedIn,
  }) => {
    await signedIn.transfer.goto();

    const reference = await signedIn.transfer.completeTransfer({
      from: CHECKING,
      to: SAVINGS,
      amount: '25.50',
    });

    /* A reference number is what a customer quotes to support; its format is
     * part of the product, not an implementation detail. */
    expect(reference).toMatch(/TXN-\d{8}-\d+/);

    /* The summary must echo what was actually requested. An application that
     * confirms a different amount from the one submitted is the worst possible
     * defect in this domain, and only this assertion catches it. */
    await expect(signedIn.transfer.confirmedFrom.locator).toContainText(CHECKING);
    await expect(signedIn.transfer.confirmedTo.locator).toContainText(SAVINGS);
    await expect(signedIn.transfer.confirmedAmount.locator).toContainText('25.50');
  });

  test('TC-XFER-006 — balances change by exactly the amount transferred', async ({ signedIn }) => {
    /* Read the starting position from the application rather than from the
     * fixture, so this test stays correct if the seed data ever changes. */
    await signedIn.accounts.goto();
    const before = await signedIn.accounts.accounts();
    const fromBefore = before.find((account) => account.name === CHECKING)!.balance;
    const toBefore = before.find((account) => account.name === SAVINGS)!.balance;

    const amount = 100;
    await signedIn.transfer.goto();
    await signedIn.transfer.completeTransfer({
      from: CHECKING,
      to: SAVINGS,
      amount: String(amount),
    });

    await signedIn.accounts.goto();
    const after = await signedIn.accounts.accounts();
    const fromAfter = after.find((account) => account.name === CHECKING)!.balance;
    const toAfter = after.find((account) => account.name === SAVINGS)!.balance;

    /*
     * Both sides, and the total. Checking only the source would miss money
     * that left one account and never arrived; checking only the total would
     * miss it going to the wrong place.
     */
    expect(fromAfter).toBeCloseTo(fromBefore - amount, 2);
    expect(toAfter).toBeCloseTo(toBefore + amount, 2);
    expect(fromAfter + toAfter).toBeCloseTo(fromBefore + toBefore, 2);
  });

  test('the confirmation step can be cancelled without moving money', async ({ signedIn }) => {
    await signedIn.accounts.goto();
    const before = await signedIn.accounts.totalBalance();

    await signedIn.transfer.goto();
    await signedIn.transfer.fillForm({ from: CHECKING, to: SAVINGS, amount: '50' });
    await signedIn.transfer.review();
    await signedIn.transfer.confirmDialog.waitForOpen();

    await signedIn.transfer.cancelConfirmButton.click();
    await signedIn.transfer.confirmDialog.waitForClose();

    await signedIn.accounts.goto();
    /* Cancelling at the confirmation step must be a genuine no-op. */
    expect(await signedIn.accounts.totalBalance()).toBeCloseTo(before, 2);
  });

  test('TC-XFER-005 — a transfer can be scheduled for a later date', async ({ signedIn }) => {
    await signedIn.transfer.goto();
    await signedIn.transfer.fillForm({ from: CHECKING, to: SAVINGS, amount: '10' });

    /* The date choice is a pair of labelled radio-style controls rather than a
     * date field, so it is driven by clicking the option a user would click. */
    await signedIn.transfer.dateTypeScheduled.click();

    await expect(signedIn.transfer.page.locator('[data-testid="transfer-form"]')).toContainText(
      /schedule/i,
    );
  });

  test('the amount field accepts only a numeric value', async ({ signedIn }) => {
    await signedIn.transfer.goto();

    /* `type="number"` is what stops a phone keyboard offering letters and what
     * makes the browser reject nonsense before the app ever sees it. */
    expect(await signedIn.transfer.amountInput.getInputType()).toBe('number');
  });

  test('a frozen account cannot transfer at all @negative', async ({ signInAs }) => {
    const bank = await signInAs('frozen');
    await bank.transfer.goto();

    /* Disabled, not merely rejected on submit — the control itself is
     * unavailable, which is the correct treatment for a blocked account. */
    await expect(bank.transfer.reviewButton.locator).toBeDisabled();
    await expect(bank.transfer.page.locator('[data-testid="bank-main-content"]')).toContainText(
      /frozen/i,
    );
  });
});
