/**
 * ===========================================================================
 * Accounts — covers TC-ACC-001..006
 * ===========================================================================
 *
 * Two personas appear here. `standard` exercises the normal list and the
 * add-account dialog; `overdraft` and `frozen` exercise the two degraded
 * states, which is only possible because the application ships accounts that
 * are genuinely in those states rather than requiring them to be mocked.
 */
import { test, expect } from '../../src/fixtures';
import { SEED } from '../../src/data/personas';

test.describe('accounts @regression @accounts', () => {
  test('TC-ACC-001 — the account list loads @smoke', async ({ signedIn }) => {
    await signedIn.dashboard.shell.navigateTo('accounts');
    await signedIn.accounts.expectLoaded();

    const names = await signedIn.accounts.accountNames();
    expect(names).toEqual(SEED.accounts.map((account) => account.name));

    /* The column set is part of the table's contract with the reader. */
    expect(await signedIn.accounts.accountsTable.getHeaders()).toEqual([
      'Account',
      'Type',
      'Balance',
      'Status',
      'Actions',
    ]);
  });

  test('TC-ACC-002 — each account shows a name, a type and a balance', async ({ signedIn }) => {
    await signedIn.accounts.goto();

    const accounts = await signedIn.accounts.accounts();
    expect(accounts).toHaveLength(SEED.accounts.length);

    for (const account of accounts) {
      expect(account.name.length, 'every account needs a name').toBeGreaterThan(0);
      /* A balance of exactly zero is legitimate, so the assertion is that the
       * value parsed at all — `parseCurrency` throws on unparseable text. */
      expect(Number.isFinite(account.balance)).toBe(true);
    }

    /* Every row carries a type badge — the thing that distinguishes checking
     * from savings at a glance. */
    const badges = await signedIn.accounts.page
      .locator('[data-testid="account-row-type-badge"]')
      .allInnerTexts();
    expect(badges).toHaveLength(accounts.length);
    expect(badges.every((badge) => badge.trim().length > 0)).toBe(true);
  });

  test('TC-ACC-003 — a negative balance is surfaced as an overdraft', async ({ signInAs }) => {
    /* The overdraft persona exists precisely so this state is reachable
     * without inventing it. */
    const bank = await signInAs('overdraft');
    await bank.accounts.goto();

    const accounts = await bank.accounts.accounts();
    const overdrawn = accounts.filter((account) => account.balance < 0);

    expect(overdrawn.length, 'the overdraft persona must have a negative account').toBeGreaterThan(
      0,
    );

    /* The number being negative is not enough — the interface has to *say*
     * so, or the user has no idea they are overdrawn. */
    const pageText = await bank.accounts.page.locator('[data-testid="accounts-page"]').innerText();
    expect(pageText).toMatch(/overdraft|overdrawn|negative/i);
  });

  test('TC-ACC-004 — a frozen account is prominently flagged', async ({ signInAs }) => {
    const bank = await signInAs('frozen');
    await bank.accounts.goto();

    const pageText = await bank.accounts.page
      .locator('[data-testid="bank-main-content"]')
      .innerText();
    expect(pageText).toMatch(/frozen/i);
  });

  test('TC-ACC-006 — a new account can be added and appears in the list', async ({ signedIn }) => {
    await signedIn.accounts.goto();
    const before = await signedIn.accounts.accountNames();

    /* A generated name, so this test never collides with itself on a re-run
     * and never depends on what a previous run left behind. */
    const name = `Holiday Fund ${Date.now().toString().slice(-6)}`;
    await signedIn.accounts.addAccount({ name });

    const after = await signedIn.accounts.accountNames();
    expect(after).toHaveLength(before.length + 1);
    expect(after).toContain(name);
  });

  test('the add-account dialog can be dismissed without saving', async ({ signedIn }) => {
    await signedIn.accounts.goto();
    const before = await signedIn.accounts.accountNames();

    await signedIn.accounts.addAccountButton.click();
    await signedIn.accounts.accountDialog.waitForOpen();
    await signedIn.accounts.accountNameInput.type('Abandoned account');
    await signedIn.accounts.cancelAccountButton.click();
    await signedIn.accounts.accountDialog.waitForClose();

    /* Cancelling must not persist anything — a dialog that saves on cancel is
     * a genuine and surprisingly common defect. */
    expect(await signedIn.accounts.accountNames()).toEqual(before);
  });

  test('the account dialog is a labelled dialog that closes on Escape @a11y', async ({
    signedIn,
  }) => {
    await signedIn.accounts.goto();
    await signedIn.accounts.addAccountButton.click();
    await signedIn.accounts.accountDialog.waitForOpen();

    const dialog = signedIn.accounts.page.getByTestId('add-account-dialog');

    /* What the application does correctly, asserted. */
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog, 'a dialog needs an accessible name').toHaveAttribute(
      'aria-labelledby',
      /.+/,
    );

    /* Escape must close it, or a keyboard user is trapped behind it. */
    await signedIn.accounts.accountDialog.closeWithEscape();
    expect(await signedIn.accounts.accountDialog.isOpen()).toBe(false);
  });

  /**
   * A SECOND DOCUMENTED DEFECT.
   *
   * The dialog has `role="dialog"` and an accessible name, but **no
   * `aria-modal="true"`**. Without it, a screen reader is not told to confine
   * the user to the dialog, so they can arrow out into the page behind it
   * while it is still open — a confusing state that sighted users never see.
   *
   * Recorded with `test.fail()` for the same reason as the skip-link defect:
   * the expectation stays visible, the run stays green, and the test turns red
   * the moment the attribute is added.
   */
  test('the account dialog should declare aria-modal @a11y @known-issue', async ({ signedIn }) => {
    test.fail(true, 'Known defect: the dialog omits aria-modal="true".');

    await signedIn.accounts.goto();
    await signedIn.accounts.addAccountButton.click();
    await signedIn.accounts.accountDialog.waitForOpen();

    expect(await signedIn.accounts.accountDialog.hasCorrectAriaSemantics()).toBe(true);
  });

  test('an account opens its own detail page with a transaction history', async ({ signedIn }) => {
    await signedIn.accounts.goto();
    const [first] = await signedIn.accounts.accounts();

    await signedIn.accounts.openAccount(first!.name);
    await signedIn.accountDetail.expectLoaded();

    await expect(signedIn.accountDetail.accountName.locator).toContainText(first!.name);
    /* The detail balance must agree with the list balance — two renderings of
     * one number, and the place a stale cache shows up. */
    expect(await signedIn.accountDetail.balance()).toBe(first!.balance);
    expect(await signedIn.accountDetail.transactionsTable.rowCount()).toBeGreaterThan(0);
  });

  test('the account detail search filters its transactions', async ({ signedIn }) => {
    await signedIn.accounts.goto();
    const [first] = await signedIn.accounts.accounts();
    await signedIn.accounts.openAccount(first!.name);

    const before = await signedIn.accountDetail.descriptions();
    expect(before.length).toBeGreaterThan(0);

    /* Search for a term taken from the data itself, so the test does not
     * depend on a description somebody hard-coded. */
    const term = (before[0] ?? '').split(' ')[0] ?? '';
    await signedIn.accountDetail.search(term);

    const after = await signedIn.accountDetail.descriptions();
    expect(after.length).toBeGreaterThan(0);
    expect(
      after.every((description) => description.toLowerCase().includes(term.toLowerCase())),
    ).toBe(true);
  });
});
