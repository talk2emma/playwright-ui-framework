import type { Locator, Page } from '@playwright/test';
import type { Button } from '../../components/form/button';
import type { Link } from '../../components/navigation/link';
import { ui, type UiFactory } from '../../components/component.factory';

/**
 * The application chrome that surrounds every signed-in page: the top bar and
 * the left sidebar.
 *
 * It is a **component, not a page object**, because it has no URL of its own
 * and appears on ten different pages. Modelling it once and composing it into
 * each page means a change to the navigation is one edit here, rather than ten
 * — and it keeps each page object about that page.
 *
 * Every page object exposes it as `shell`, so a test navigates the same way
 * regardless of where it happens to be.
 */
export class BankShell {
  private readonly factory: UiFactory;

  /* Top bar -------------------------------------------------------------- */
  readonly brandLink;
  readonly logoutButton;
  readonly notificationsLink;
  readonly topbarNotificationBadge;
  readonly mobileMenuButton;

  /* Sidebar -------------------------------------------------------------- */
  readonly sidebar;
  readonly sidebarNotificationBadge;
  readonly userInfo;

  constructor(private readonly page: Page) {
    this.factory = ui(page);

    this.brandLink = this.factory.link('[data-testid="bank-brand-link"]', { name: 'SecureBank' });
    this.logoutButton = this.factory.button('[data-testid="topbar-logout-btn"]', {
      name: 'Logout',
    });
    this.notificationsLink = this.factory.link('[data-testid="nav-notifications-link"]', {
      name: 'Notifications',
    });
    this.topbarNotificationBadge = this.factory.button(
      '[data-testid="topbar-notification-badge"]',
      { name: 'Unread badge (top bar)' },
    );
    this.mobileMenuButton = this.factory.button('[data-testid="mobile-menu-btn"]', {
      name: 'Open navigation',
    });

    this.sidebar = this.factory.menu('[data-testid="bank-sidebar"]', { name: 'Sidebar' });
    this.sidebarNotificationBadge = this.factory.button(
      '[data-testid="sidebar-notification-badge"]',
      { name: 'Unread badge (sidebar)' },
    );
    this.userInfo = this.factory.card('[data-testid="sidebar-user-info"]', {
      name: 'Signed-in user',
    });
  }

  /**
   * The sidebar destinations, keyed by the slug the application uses.
   *
   * A record rather than a method per link: the pattern is completely regular,
   * and eleven near-identical methods would be eleven places to update.
   */
  navLink(destination: NavDestination): Link {
    return this.factory.link(`[data-testid="sidebar-link-${destination}"]`, {
      name: `Sidebar: ${destination}`,
    });
  }

  /** Clicks a sidebar destination and waits for the URL to settle. */
  async navigateTo(destination: NavDestination): Promise<void> {
    await this.navLink(destination).clickAndWait(new RegExp(`/bank/${destination}$`));
  }

  /**
   * The theme toggle.
   *
   * This is the one control in the application with **no `data-testid`**, so it
   * is located by its accessible name instead. That is not a workaround: an
   * accessible-name locator asserts something a test id cannot — that the
   * control is announced correctly to a screen reader. If the label were ever
   * removed, this locator would fail, and it should.
   */
  get themeToggle(): Button {
    return this.factory.button(
      this.page.getByRole('button', { name: /switch to (dark|light) mode/i }),
      { name: 'Theme toggle' },
    );
  }

  /** True when the application is currently rendering its dark theme. */
  async isDarkMode(): Promise<boolean> {
    return this.page.evaluate(() => document.documentElement.classList.contains('dark'));
  }

  /** Flips the theme and returns the mode that is now active. */
  async toggleTheme(): Promise<boolean> {
    /*
     * The current mode is read BEFORE the click. Reading it afterwards — as an
     * earlier version of this method did — passes the already-changed value
     * into the wait, so the condition can never become true and the call times
     * out. Cheap mistake, expensive symptom: it looks like the application
     * failed to switch theme.
     */
    const wasDark = await this.isDarkMode();

    await this.themeToggle.click();

    /* Waiting for the class to flip, rather than for a duration, is what keeps
     * this from being a sleep in disguise. */
    await this.page.waitForFunction(
      (previous) => document.documentElement.classList.contains('dark') !== previous,
      wasDark,
      { timeout: 5_000 },
    );
    return this.isDarkMode();
  }

  /** The unread-notification count, or 0 when the badge is absent entirely. */
  async unreadCount(): Promise<number> {
    /* The badge is removed from the DOM when nothing is unread, so "absent"
     * has to be read as zero rather than as a failure to find it. */
    if ((await this.sidebarNotificationBadge.count()) === 0) return 0;
    const text = await this.sidebarNotificationBadge.getText();
    return Number(text.replace(/\D/g, '')) || 0;
  }

  /** Signs out and waits for the login page. */
  async logout(): Promise<void> {
    await this.logoutButton.clickAndWaitForCompletion();
    await this.page.waitForURL(/\/bank\/login/, { timeout: 15_000 });
  }

  /**
   * The navigation drawer shown on narrow viewports.
   *
   * Opening it renders a **second** `[data-testid="bank-sidebar"]` inside an
   * overlay, so the desktop sidebar and the drawer both match that selector
   * and Playwright's strict mode rejects an unscoped lookup. Scoping to the
   * overlay is the fix; `.first()` would silently pick the hidden desktop copy
   * and produce a "visible" assertion that can never pass.
   */
  get mobileDrawer(): Locator {
    return this.page.getByTestId('mobile-menu-overlay');
  }

  /** A navigation link inside the mobile drawer specifically. */
  mobileNavLink(destination: NavDestination): Locator {
    return this.mobileDrawer.getByTestId(`sidebar-link-${destination}`);
  }

  /** Opens the mobile drawer and waits for it to be usable. */
  async openMobileMenu(): Promise<void> {
    await this.mobileMenuButton.click();
    await this.mobileDrawer.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /**
   * The "skip to content" link.
   *
   * Visually hidden until focused — the standard pattern. It is exposed here
   * because its behaviour is asserted by the accessibility suite.
   */
  get skipLink(): Locator {
    return this.page.getByTestId('skip-to-content');
  }

  /** The username shown in the sidebar footer. */
  async signedInAs(): Promise<string> {
    return (await this.userInfo.getText()).trim();
  }
}

/** Every sidebar destination, as the application slugs them. */
export type NavDestination =
  | 'dashboard'
  | 'accounts'
  | 'transfer'
  | 'send-money'
  | 'bill-pay'
  | 'transactions'
  | 'apply-loan'
  | 'notifications'
  | 'profile'
  | 'test-cases';
