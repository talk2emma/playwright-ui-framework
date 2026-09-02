import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import { TIMEOUTS } from '../../config/timeouts';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export type AlertSeverity = 'success' | 'info' | 'warning' | 'error' | 'unknown';

export interface AlertOptions extends ComponentOptions {
  messageSelector?: string;
  closeSelector?: string;
}

/**
 * Toast / snackbar / inline alert.
 *
 * Toasts are transient by design, so `waitForMessage` races the auto-dismiss
 * timer rather than assuming the element is still there.
 */
export class Alert extends BaseComponent {
  private readonly messageSelector: string | undefined;
  private readonly closeSelector: string;

  protected override get componentType(): string {
    return 'Alert';
  }

  constructor(scope: Scope, selector: SelectorLike, options: AlertOptions = {}) {
    super(scope, selector, options);
    this.messageSelector = options.messageSelector;
    this.closeSelector = options.closeSelector ?? '[aria-label*="close" i], .close, button';
  }

  /** Waits for the alert to appear and returns its text before it disappears. */
  async waitForMessage(timeout = TIMEOUTS.SHORT): Promise<string> {
    return this.step('wait for message', async () => {
      await this.locator.first().waitFor({ state: 'visible', timeout });
      const source = this.messageSelector
        ? this.locator.first().locator(this.messageSelector)
        : this.locator.first();
      return normalizeText(await source.innerText());
    });
  }

  async getMessage(): Promise<string> {
    const source = this.messageSelector
      ? this.locator.first().locator(this.messageSelector)
      : this.locator.first();
    return normalizeText(await source.innerText());
  }

  async getAllMessages(): Promise<string[]> {
    return (await this.locator.allInnerTexts()).map(normalizeText).filter(Boolean);
  }

  /** Classifies the alert from its role/class — success vs error assertions. */
  async getSeverity(): Promise<AlertSeverity> {
    const [className, role, dataType] = await Promise.all([
      this.locator.first().getAttribute('class'),
      this.locator.first().getAttribute('role'),
      this.locator.first().getAttribute('data-type'),
    ]);
    const haystack = `${className ?? ''} ${dataType ?? ''}`.toLowerCase();
    if (/success|positive/.test(haystack)) return 'success';
    if (/error|danger|critical/.test(haystack) || role === 'alert') return 'error';
    if (/warn/.test(haystack)) return 'warning';
    if (/info|notice/.test(haystack)) return 'info';
    return 'unknown';
  }

  async dismiss(): Promise<void> {
    await this.step('dismiss', async () => {
      const close = this.locator.first().locator(this.closeSelector).first();
      if ((await close.count()) > 0) await close.click({ timeout: this.timeout });
      else await this.locator.first().click({ timeout: this.timeout });
      await this.locator
        .first()
        .waitFor({ state: 'hidden', timeout: TIMEOUTS.SHORT })
        .catch(() => undefined);
    });
  }

  async dismissAll(): Promise<void> {
    await this.step('dismiss all alerts', async () => {
      while ((await this.locator.count()) > 0 && (await this.locator.first().isVisible())) {
        await this.dismiss();
      }
    });
  }

  /** Confirms the toast disappears on its own within the expected window. */
  async waitForAutoDismiss(timeout = TIMEOUTS.MEDIUM): Promise<void> {
    await this.locator.first().waitFor({ state: 'hidden', timeout });
  }

  async count(): Promise<number> {
    return this.locator.count();
  }

  /** Screen readers only announce alerts with a live region. */
  async isAnnouncedToScreenReaders(): Promise<boolean> {
    const [role, live] = await Promise.all([
      this.locator.first().getAttribute('role'),
      this.locator.first().getAttribute('aria-live'),
    ]);
    return role === 'alert' || role === 'status' || live === 'polite' || live === 'assertive';
  }
}
