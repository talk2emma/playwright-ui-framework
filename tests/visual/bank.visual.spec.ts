/**
 * ===========================================================================
 * Visual regression — SecureBank
 * ===========================================================================
 *
 * Runs as its own project so a pixel change never blocks a functional run, and
 * so baselines can be refreshed deliberately with `npm run test:visual:update`.
 *
 * ---------------------------------------------------------------------------
 * WHAT MAKES A VISUAL TEST WORTH HAVING RATHER THAN AN ANNOYANCE
 * ---------------------------------------------------------------------------
 * Two things, both applied below.
 *
 * **Stabilise before capturing.** Animations, carets, lazy images and — here —
 * live monetary figures all change between runs. Anything that legitimately
 * varies must be frozen or masked, or the test fails for reasons nobody cares
 * about and gets deleted within a month.
 *
 * **Capture the smallest meaningful region.** A full-page snapshot fails when
 * anything anywhere changes, so it tells you a page changed without telling
 * you what. Component-level snapshots point at the thing that moved.
 *
 * The balances on this application change whenever any test performs a
 * transfer, so every figure is masked. What remains under test is the
 * *layout*: spacing, alignment, ordering and theme — which is exactly what a
 * screenshot is good at and an assertion is bad at.
 */
import { test, expect } from '../../src/fixtures';

test.describe('visual regression @visual', () => {
  test('the login page renders consistently @smoke', async ({ bank }) => {
    await bank.login.goto();

    /* The login page is fully static — no balances, no dates — so it is the
     * one page that can be captured whole without masking. */
    await expect(bank.login.page).toHaveScreenshot('login-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('the dashboard stat cards render consistently', async ({ signedIn }) => {
    await signedIn.dashboard.goto();

    /*
     * Masked, not skipped. Every figure on these cards moves whenever another
     * test transfers money, so the numbers are covered and the card layout is
     * what gets compared. Masking the volatile part is what makes the stable
     * part testable at all.
     */
    await expect(signedIn.dashboard.statCards.locator).toHaveScreenshot('dashboard-stats.png', {
      animations: 'disabled',
      mask: [signedIn.dashboard.page.locator('[data-testid="stat-card-value"]')],
    });
  });

  test('the sidebar renders consistently in both themes', async ({ signedIn }) => {
    await signedIn.dashboard.goto();

    const sidebar = signedIn.dashboard.page.getByTestId('bank-sidebar').first();

    await expect(sidebar).toHaveScreenshot('sidebar-light.png', {
      animations: 'disabled',
      /* The unread badge is a live count that other tests change. */
      mask: [signedIn.dashboard.page.getByTestId('sidebar-notification-badge')],
    });

    await signedIn.dashboard.shell.toggleTheme();

    /* The same component in the other theme. A palette regression that only
     * affects dark mode is invisible to a light-mode-only baseline. */
    await expect(sidebar).toHaveScreenshot('sidebar-dark.png', {
      animations: 'disabled',
      mask: [signedIn.dashboard.page.getByTestId('sidebar-notification-badge')],
    });
  });

  test('the transfer form renders consistently', async ({ signedIn }) => {
    await signedIn.transfer.goto();

    /* A form is a good visual-test subject: its value is entirely in layout
     * and alignment, which assertions cannot express and a screenshot can. */
    await expect(signedIn.transfer.page.getByTestId('transfer-form')).toHaveScreenshot(
      'transfer-form.png',
      {
        animations: 'disabled',
        /* The available-balance hint moves with the data. */
        mask: [signedIn.transfer.page.getByText(/Available:/i)],
      },
    );
  });

  test('the empty transactions state renders consistently', async ({ signedIn }) => {
    await signedIn.transactions.goto();
    await signedIn.transactions.search('zzz-no-such-transaction-zzz');

    /*
     * Empty states are worth capturing precisely because they are rare in
     * development and easy to break. Nothing here is data-dependent, so no
     * mask is needed.
     */
    await expect(
      signedIn.transactions.page.getByTestId('all-transactions-table-wrapper'),
    ).toHaveScreenshot('transactions-empty.png', { animations: 'disabled' });
  });
});
