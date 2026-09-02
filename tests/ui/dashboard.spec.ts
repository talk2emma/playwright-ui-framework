/**
 * ===========================================================================
 * Dashboard — covers the application's own TC-DASH-001..006
 * ===========================================================================
 *
 * SecureBank publishes a catalogue of intended test cases at `/bank/test-cases`.
 * This suite implements the six for the dashboard, and each test names the case
 * it satisfies — so a reviewer can check coverage against the app's own spec
 * rather than against somebody's memory.
 */
import { test, expect } from '../../src/fixtures';
import { SEED } from '../../src/data/personas';

test.describe('dashboard @regression @dashboard', () => {
  test('TC-DASH-001 — loads with a personalised welcome @smoke', async ({ signedIn }) => {
    await signedIn.dashboard.expectLoaded();

    await expect(signedIn.dashboard.welcomeMessage.locator).toContainText(SEED.displayName);
    /* The four summary cards are the page's reason to exist; asserting the
     * count catches a card that stopped rendering, which no individual value
     * assertion would notice. */
    expect(await signedIn.dashboard.statCards.itemCount()).toBe(4);
  });

  test('TC-DASH-002 — total net worth equals the sum of the accounts', async ({ signedIn }) => {
    const dashboardTotal = await signedIn.dashboard.netWorth();

    /* The interesting assertion is not "is it $17,050" — that would only
     * restate the fixture. It is that two *independently rendered* views of
     * the same underlying data agree. A rounding bug or a stale cache in
     * either place breaks this and nothing else. */
    await signedIn.dashboard.shell.navigateTo('accounts');
    const accountsTotal = await signedIn.accounts.totalBalance();

    expect(dashboardTotal).toBe(accountsTotal);
    expect(dashboardTotal).toBe(SEED.netWorth);
  });

  test('TC-DASH-003 — recent transactions shows at most five rows', async ({ signedIn }) => {
    const rowCount = await signedIn.dashboard.recentTransactions.rowCount();

    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThanOrEqual(SEED.recentTransactionLimit);

    /* The widget's columns are part of its contract with the reader. */
    const headers = await signedIn.dashboard.recentTransactions.getHeaders();
    expect(headers).toEqual(['Date', 'Description', 'Category', 'Amount']);

    /* And every row must actually carry a description — an empty cell here
     * means a transaction the user cannot identify. */
    const descriptions = await signedIn.dashboard.page
      .locator('[data-testid="recent-txn-description"]')
      .allInnerTexts();
    expect(descriptions.every((text) => text.trim().length > 0)).toBe(true);
  });

  test('TC-DASH-004 — the transfer quick action navigates to the transfer page', async ({
    signedIn,
  }) => {
    await signedIn.dashboard.useQuickAction('transfer');

    await expect(signedIn.transfer.page).toHaveURL(/\/bank\/transfer$/);
    /* URL plus ready indicator: the URL proves routing, the indicator proves
     * the destination actually rendered. */
    await signedIn.transfer.expectLoaded();
  });

  test('TC-DASH-005 — the bill-pay quick action navigates to bill pay', async ({ signedIn }) => {
    await signedIn.dashboard.useQuickAction('bill-pay');

    await expect(signedIn.billPay.page).toHaveURL(/\/bank\/bill-pay$/);
    await signedIn.billPay.expectLoaded();
  });

  test('TC-DASH-006 — the theme toggle switches dark mode both ways', async ({ signedIn }) => {
    const shell = signedIn.dashboard.shell;
    const initiallyDark = await shell.isDarkMode();

    const afterFirst = await shell.toggleTheme();
    expect(afterFirst).toBe(!initiallyDark);

    /* Toggling back matters: a control that only works in one direction is a
     * common defect, and a single click would never reveal it. */
    const afterSecond = await shell.toggleTheme();
    expect(afterSecond).toBe(initiallyDark);
  });

  test('every quick action leads somewhere that loads', async ({ signedIn }) => {
    /* A data-driven sweep over all five tiles. Written as one test rather than
     * five because the assertion is identical — but note it navigates back
     * each time, so a failure names the tile that broke. */
    const actions = ['transfer', 'send-money', 'bill-pay', 'apply-loan', 'transactions'] as const;

    for (const action of actions) {
      await signedIn.dashboard.goto();
      await signedIn.dashboard.useQuickAction(action);
      await expect(
        signedIn.dashboard.page,
        `quick action "${action}" did not reach its page`,
      ).toHaveURL(new RegExp(`/bank/${action}$`));
    }
  });

  test('the stat cards are labelled and carry values', async ({ signedIn }) => {
    const stats = await signedIn.dashboard.stats();

    expect(stats.map((stat) => stat.label)).toEqual([
      'Total Net Worth',
      'Net Change',
      'Income',
      'Expenses',
    ]);
    /* Every card shows a currency figure — a card with a label and no value is
     * a loading state that never resolved. */
    expect(stats.every((stat) => /\$/.test(stat.value))).toBe(true);
  });
});
