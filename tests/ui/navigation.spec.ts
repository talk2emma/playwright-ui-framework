/**
 * ===========================================================================
 * Application shell — navigation, chrome and responsive behaviour
 * ===========================================================================
 *
 * The sidebar and top bar appear on every signed-in page, so they are modelled
 * once as a component (`BankShell`) and tested once here rather than being
 * re-asserted in each page's spec.
 */
import { test, expect } from '../../src/fixtures';
import { PERSONAS } from '../../src/data/personas';
import type { NavDestination } from '../../src/pages/bank';

/** Every sidebar destination and the heading that proves it arrived. */
const DESTINATIONS: { slug: NavDestination; indicator: string }[] = [
  { slug: 'dashboard', indicator: '[data-testid="bank-dashboard-page"]' },
  { slug: 'accounts', indicator: '[data-testid="accounts-page"]' },
  { slug: 'transfer', indicator: '[data-testid="transfer-page"]' },
  { slug: 'send-money', indicator: '[data-testid="send-money-page"]' },
  { slug: 'bill-pay', indicator: '[data-testid="bill-pay-page"]' },
  { slug: 'transactions', indicator: '[data-testid="transactions-page"]' },
  { slug: 'apply-loan', indicator: '[data-testid="apply-loan-page"]' },
  { slug: 'notifications', indicator: '[data-testid="notifications-page"]' },
  { slug: 'profile', indicator: '[data-testid="profile-page"]' },
  { slug: 'test-cases', indicator: '[data-testid="test-cases-page"]' },
];

test.describe('navigation @regression @navigation', () => {
  /*
   * A generated test per destination rather than one loop inside a single
   * test. Ten separate results mean a broken link names itself in the report;
   * one looping test would just say "navigation failed".
   */
  for (const { slug, indicator } of DESTINATIONS) {
    test(`the sidebar reaches ${slug}`, async ({ signedIn }) => {
      await signedIn.dashboard.shell.navigateTo(slug);

      await expect(signedIn.dashboard.page).toHaveURL(new RegExp(`/bank/${slug}$`));
      await expect(signedIn.dashboard.page.locator(indicator)).toBeVisible();
    });
  }

  test('the brand link returns to the dashboard from anywhere @smoke', async ({ signedIn }) => {
    await signedIn.dashboard.shell.navigateTo('transactions');
    await signedIn.dashboard.shell.brandLink.clickAndWait(/\/bank\/dashboard$/);

    await signedIn.dashboard.expectLoaded();
  });

  test('the signed-in username is shown in the sidebar', async ({ signedIn }) => {
    expect(await signedIn.dashboard.shell.signedInAs()).toContain(PERSONAS.standard.username);
  });

  test('the unread badge reflects the notification count', async ({ signedIn }) => {
    /* The badge and the notifications page are two renderings of one number.
     * Asserting they agree catches the stale-badge defect, which is invisible
     * from either view alone. */
    const badgeCount = await signedIn.dashboard.shell.unreadCount();

    await signedIn.dashboard.shell.navigateTo('notifications');
    const pageCount = await signedIn.notifications.unreadCount();

    expect(badgeCount).toBe(pageCount);
  });

  test('the sidebar collapses behind a menu button on a narrow viewport', async ({ signedIn }) => {
    /* Resizing rather than using a separate mobile project, because the
     * assertion is about the *breakpoint* — that the layout responds — not
     * about a specific device. The mobile projects in playwright.config.ts
     * cover the device dimension. */
    await signedIn.dashboard.page.setViewportSize({ width: 390, height: 844 });

    await expect(signedIn.dashboard.shell.mobileMenuButton.locator).toBeVisible();

    /*
     * Opening the drawer renders a SECOND copy of the sidebar inside an
     * overlay, so the assertion is scoped to the drawer. An unscoped lookup
     * matches both copies and fails strict mode; `.first()` picks the hidden
     * desktop one and can never be visible. Scoping is the only correct
     * answer, which is why the page object exposes `mobileNavLink`.
     */
    await signedIn.dashboard.shell.openMobileMenu();
    await expect(signedIn.dashboard.shell.mobileNavLink('accounts')).toBeVisible();
  });

  test('the skip-to-content link works when focused @a11y', async ({ signedIn }) => {
    const skip = signedIn.dashboard.shell.skipLink;

    /*
     * The `sr-only` pattern clips the link to a 1x1 box rather than hiding it,
     * because a `display: none` element cannot be focused at all. Playwright
     * therefore reports it as *visible*, and `toBeHidden()` would fail here
     * for the wrong reason — the link is doing exactly what it should.
     *
     * So the assertion is about the **box**, which is what actually
     * distinguishes "clipped for sighted users" from "on screen".
     */
    const clipped = await skip.boundingBox();
    expect(clipped?.width, 'the skip link should be clipped before focus').toBeLessThanOrEqual(1);

    await skip.focus();

    const focused = await skip.boundingBox();
    expect(
      focused?.width ?? 0,
      'focusing the skip link must reveal it at a usable size',
    ).toBeGreaterThan(20);

    /* And it must point at something that exists, or it moves focus nowhere. */
    await expect(skip).toHaveAttribute('href', '#main-content');
    await expect(signedIn.dashboard.page.locator('#main-content')).toHaveCount(1);
  });

  /**
   * A DOCUMENTED DEFECT, not a broken test.
   *
   * WCAG 2.4.1 ("Bypass Blocks") requires a keyboard user to be able to skip
   * repeated navigation. SecureBank ships the correct markup — the link is
   * first in the DOM, targets a real element, and works when focused — but the
   * **first Tab bypasses it** and lands on the brand link instead, so a
   * keyboard user can never reach it. Verified directly against the running
   * application, not inferred.
   *
   * `test.fail()` is the right tool here rather than a skip or a deletion:
   *
   *   · The expectation stays in the suite, written as it should behave.
   *   · The run stays green while the defect exists, so nobody learns to
   *     ignore a permanently red test.
   *   · The moment somebody fixes it, this test **fails** — telling us the
   *     defect is gone and the annotation should be removed.
   *
   * A skipped test would go quiet forever; a deleted one would lose the
   * finding entirely.
   */
  test('the skip link should be the first thing Tab reaches @a11y @known-issue', async ({
    signedIn,
  }) => {
    test.fail(
      true,
      'Known defect: the first Tab focuses the brand link, bypassing the skip link (WCAG 2.4.1).',
    );

    await signedIn.dashboard.page.keyboard.press('Tab');

    const focused = signedIn.dashboard.page.locator(':focus');
    await expect(focused).toHaveAttribute('data-testid', 'skip-to-content');
  });
});
