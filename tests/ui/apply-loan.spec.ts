/**
 * ===========================================================================
 * Loan applications — covers TC-LOAN-001..006
 * ===========================================================================
 *
 * This page carries the application's **planted defect**, and TC-LOAN-004 asks
 * for it to be reproduced. That makes this the most interesting suite in the
 * repository: it is the one that demonstrates the framework finding a real bug
 * rather than confirming things work.
 */
import { test, expect } from '../../src/fixtures';
import { SEED } from '../../src/data/personas';

test.describe('apply for a loan @regression @loans', () => {
  test('TC-LOAN-001 — the application dialog opens with its fields @smoke', async ({
    signedIn,
  }) => {
    await signedIn.applyLoan.goto();
    await signedIn.applyLoan.expectLoaded();

    await signedIn.applyLoan.openApplication();

    await expect(signedIn.applyLoan.loanTypeDropdown.locator).toBeVisible();
    await expect(signedIn.applyLoan.loanAmountInput.locator).toBeVisible();
    await expect(signedIn.applyLoan.loanTermDropdown.locator).toBeVisible();
    await expect(signedIn.applyLoan.loanAccountDropdown.locator).toBeVisible();
  });

  test('the loan type dropdown offers the documented products', async ({ signedIn }) => {
    await signedIn.applyLoan.goto();
    await signedIn.applyLoan.openApplication();
    await signedIn.applyLoan.loanTypeDropdown.open();

    const types = await signedIn.applyLoan.loanTypeDropdown.optionsLocator.allInnerTexts();
    /* The sidebar advertises "Personal, auto, home & more"; the dropdown must
     * agree with the marketing, or one of the two is wrong. */
    expect(types.length).toBeGreaterThanOrEqual(3);
    expect(types.join(' ').toLowerCase()).toMatch(/personal|auto|home/);
  });

  test('TC-LOAN-002 — an amount over the ceiling is refused @negative', async ({ signedIn }) => {
    await signedIn.applyLoan.goto();
    await signedIn.applyLoan.openApplication();

    /* A loan type is required before the amount is validated — established by
     * submitting without one and reading "Please select a loan type". */
    await signedIn.applyLoan.fillApplication({
      type: 'Personal',
      amount: String(SEED.maximumLoanAmount + 1),
    });
    await signedIn.applyLoan.reviewLoanButton.click();

    /* The dialog must stay open with a message: an over-limit application that
     * silently succeeded would be a serious defect in a lending product. */
    expect(await signedIn.applyLoan.loanDialog.isOpen()).toBe(true);
    await expect(
      signedIn.applyLoan.page.locator('[data-testid="apply-loan-dialog"]'),
    ).toContainText(/250,000|maximum|exceed/i);
  });

  test('TC-LOAN-006 — the history table paginates five rows at a time', async ({ signedIn }) => {
    await signedIn.applyLoan.goto();

    const rows = await signedIn.applyLoan.historyRowCount();
    expect(rows).toBeLessThanOrEqual(SEED.loanHistoryPageSize);
    expect(rows).toBeGreaterThan(0);
  });

  test('the history paginator turns the page', async ({ signedIn }) => {
    await signedIn.applyLoan.goto();

    /*
     * Guarded with `test.skip` rather than an `if`, so the reason is recorded
     * in the report when there is only one page of history. A conditional
     * inside the body would make the test silently assert nothing — which
     * looks identical to a passing test.
     */
    const canPage = await signedIn.applyLoan.historyNextButton.isEnabled();
    test.skip(!canPage, 'Only one page of loan history for this persona.');

    const firstPage = await signedIn.applyLoan.historyAmounts();
    await signedIn.applyLoan.historyNextButton.click();
    await signedIn.applyLoan.waitForIdle();

    expect(await signedIn.applyLoan.historyAmounts()).not.toEqual(firstPage);
  });

  test('the history search filters the loan list', async ({ signedIn }) => {
    await signedIn.applyLoan.goto();
    const before = await signedIn.applyLoan.historyRowCount();

    await signedIn.applyLoan.historySearch.typeAndSettle('zzz-no-such-loan');

    /* Filtering to nothing is the clearest proof the filter is wired up. */
    expect(await signedIn.applyLoan.historyRowCount()).toBeLessThan(before);
  });

  test('TC-LOAN-005 — a frozen account cannot apply @negative', async ({ signInAs }) => {
    const bank = await signInAs('frozen');
    await bank.applyLoan.goto();

    await expect(bank.applyLoan.openApplyLoanButton.locator).toBeDisabled();
  });

  /**
   * =========================================================================
   * TC-LOAN-004 — REPRODUCING THE PLANTED DEFECT
   * =========================================================================
   *
   * The application deliberately ships a bug for `error_user`: the total shown
   * beneath the loan history does not equal the sum of the loans in it.
   *
   * This is the most valuable test in the suite, because it is the only one
   * that proves the framework can *find* something rather than confirm that
   * things work. The assertion is written the way it would be written against
   * a real system — total equals the sum of its parts — and it is expected to
   * fail, which is exactly what `test.fail()` records.
   *
   * When somebody fixes the defect, this test goes red and tells us to remove
   * the annotation. A skipped test would go quiet; a deleted one would lose
   * the finding.
   */
  test('TC-LOAN-004 — the history total should equal the sum of the loans @known-issue', async ({
    signInAs,
  }) => {
    test.fail(
      true,
      'Planted defect: for error_user the displayed total omits the most recent loan.',
    );

    const bank = await signInAs('buggy');
    await bank.applyLoan.goto();

    /* The displayed figure first — reading it after paging through the history
     * would read it from the last page. */
    const displayed = await bank.applyLoan.displayedTotal();
    const expected = await bank.applyLoan.expectedActiveTotal();

    expect(
      displayed,
      `the history total shows ${displayed} but the active and pending loans sum to ${expected}`,
    ).toBeCloseTo(expected, 2);
  });

  test('the same total is correct for a healthy account', async ({ signedIn }) => {
    /*
     * The control for the test above. Without it, a failing total for
     * `error_user` could just as easily mean the assertion is wrong — this
     * proves the same assertion passes where the data is sound, which is what
     * makes the planted-defect result trustworthy.
     */
    await signedIn.applyLoan.goto();

    const displayed = await signedIn.applyLoan.displayedTotal();
    const expected = await signedIn.applyLoan.expectedActiveTotal();

    expect(displayed).toBeCloseTo(expected, 2);
  });
});
