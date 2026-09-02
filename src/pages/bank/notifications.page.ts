import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../../types';

/** The notification centre, and the unread badges it drives. */
export class NotificationsPage extends BasePage {
  protected readonly path = '/bank/notifications';
  protected readonly readyIndicator: SelectorLike = '[data-testid="notifications-page"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  readonly unreadCountText;
  readonly markAllReadButton;
  readonly list;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.unreadCountText = this.factory.card('[data-testid="unread-count-text"]', {
      name: 'Unread count',
    });
    this.markAllReadButton = this.factory.button('[data-testid="mark-all-read-btn"]', {
      name: 'Mark all as read',
    });
    this.list = this.factory.list('[data-testid="notifications-list"]', {
      name: 'Notifications',
      itemSelector: '[data-testid="notification-item"]',
    });
  }

  /** How many notifications are shown, read and unread together. */
  async itemCount(): Promise<number> {
    return this.page.locator('[data-testid="notification-item"]').count();
  }

  /**
   * The unread count.
   *
   * The element is **removed from the DOM** once everything is read, so its
   * absence has to be read as zero. A test that waited for it to say "0" would
   * hang until the timeout — a good example of why an "absent" state deserves
   * a method rather than an inline locator.
   */
  async unreadCount(): Promise<number> {
    if ((await this.unreadCountText.count()) === 0) return 0;
    const text = await this.unreadCountText.getText();
    return Number(text.replace(/\D/g, '')) || 0;
  }

  /** How many items still offer a "mark as read" control. */
  async unreadItemCount(): Promise<number> {
    return this.page.locator('[data-testid="mark-read-btn"]').count();
  }

  /** Marks the first unread item as read. */
  async markFirstAsRead(): Promise<void> {
    await this.page.locator('[data-testid="mark-read-btn"]').first().click();
    await this.waitForIdle();
  }

  /** Marks everything as read and waits for the count to disappear. */
  async markAllAsRead(): Promise<void> {
    await this.markAllReadButton.click();
    await this.page
      .locator('[data-testid="mark-read-btn"]')
      .first()
      .waitFor({ state: 'detached', timeout: 10_000 })
      .catch(() => undefined);
  }
}
