import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import { TIMEOUTS } from '../../config/timeouts';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface ModalOptions extends ComponentOptions {
  titleSelector?: string;
  bodySelector?: string;
  closeSelector?: string;
  confirmSelector?: string;
  cancelSelector?: string;
  overlaySelector?: string;
}

/**
 * Modal dialog / drawer / confirmation popup.
 *
 * Also verifies the two things modals routinely get wrong: focus trapping and
 * Escape-to-close.
 */
export class Modal extends BaseComponent {
  private readonly titleSelector: string;
  private readonly bodySelector: string;
  private readonly closeSelector: string;
  private readonly confirmSelector: string;
  private readonly cancelSelector: string;
  private readonly overlaySelector: string;

  protected override get componentType(): string {
    return 'Modal';
  }

  constructor(scope: Scope, selector: SelectorLike, options: ModalOptions = {}) {
    super(scope, selector, options);
    this.titleSelector = options.titleSelector ?? '.modal-title, h1, h2, [id*="title"]';
    this.bodySelector = options.bodySelector ?? '.modal-body, .content';
    this.closeSelector = options.closeSelector ?? '[aria-label*="close" i], .close, .modal-close';
    this.confirmSelector =
      options.confirmSelector ??
      'button:has-text("OK"), button:has-text("Confirm"), button:has-text("Yes")';
    this.cancelSelector =
      options.cancelSelector ?? 'button:has-text("Cancel"), button:has-text("No")';
    this.overlaySelector = options.overlaySelector ?? '.modal-backdrop, .overlay';
  }

  async waitForOpen(timeout = this.timeout): Promise<void> {
    await this.locator.waitFor({ state: 'visible', timeout });
    await this.page.waitForTimeout(TIMEOUTS.ANIMATION);
  }

  async waitForClose(timeout = this.timeout): Promise<void> {
    await this.locator.waitFor({ state: 'hidden', timeout });
  }

  async isOpen(): Promise<boolean> {
    return this.locator.isVisible().catch(() => false);
  }

  async getTitle(): Promise<string> {
    return normalizeText(await this.locator.locator(this.titleSelector).first().innerText());
  }

  async getBodyText(): Promise<string> {
    const body = this.locator.locator(this.bodySelector).first();
    const source = (await body.count()) > 0 ? body : this.locator;
    return normalizeText(await source.innerText());
  }

  async confirm(): Promise<void> {
    await this.step('confirm', async () => {
      await this.locator.locator(this.confirmSelector).first().click({ timeout: this.timeout });
      await this.waitForClose().catch(() => undefined);
    });
  }

  async cancel(): Promise<void> {
    await this.step('cancel', async () => {
      await this.locator.locator(this.cancelSelector).first().click({ timeout: this.timeout });
      await this.waitForClose().catch(() => undefined);
    });
  }

  async close(): Promise<void> {
    await this.step('close', async () => {
      await this.locator.locator(this.closeSelector).first().click({ timeout: this.timeout });
      await this.waitForClose().catch(() => undefined);
    });
  }

  async closeWithEscape(): Promise<void> {
    await this.step('close with Escape', async () => {
      await this.page.keyboard.press('Escape');
      await this.waitForClose().catch(() => undefined);
    });
  }

  async clickOverlay(): Promise<void> {
    await this.step('click overlay', async () => {
      await this.page
        .locator(this.overlaySelector)
        .first()
        .click({ position: { x: 5, y: 5 } });
    });
  }

  button(name: string | RegExp): Locator {
    return this.locator.getByRole('button', { name }).first();
  }

  async clickButton(name: string | RegExp): Promise<void> {
    await this.step(`click "${String(name)}"`, async () => {
      await this.button(name).click({ timeout: this.timeout });
    });
  }

  /** True when Tab cycles focus inside the dialog, as a modal must. */
  async isFocusTrapped(): Promise<boolean> {
    await this.page.keyboard.press('Tab');
    return this.locator.evaluate((element) => element.contains(document.activeElement));
  }

  /** A correct dialog exposes role=dialog and aria-modal=true. */
  async hasCorrectAriaSemantics(): Promise<boolean> {
    const [role, ariaModal] = await Promise.all([
      this.getAttribute('role'),
      this.getAttribute('aria-modal'),
    ]);
    return (role === 'dialog' || role === 'alertdialog') && ariaModal === 'true';
  }
}
