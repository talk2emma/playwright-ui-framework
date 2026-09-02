import { BaseComponent } from '../../core/base.component';
import type { ClickOptions } from '../../types';

/**
 * Any clickable control: `<button>`, `<input type="submit">`, `<a role="button">`
 * or a div that a framework pretends is a button.
 */
export class Button extends BaseComponent {
  protected override get componentType(): string {
    return 'Button';
  }

  /** Clicks only once the control is genuinely interactive. */
  async clickWhenReady(options: ClickOptions = {}): Promise<void> {
    await this.step('click when enabled', async () => {
      await this.waitForEnabled();
      await this.prepare();
      await this.locator.click({ timeout: this.timeout, ...options });
    });
  }

  /** Clicks and waits for the resulting navigation to settle. */
  async clickAndNavigate(urlPattern?: string | RegExp): Promise<void> {
    await this.step('click and navigate', async () => {
      await this.prepare();
      await Promise.all([
        urlPattern
          ? this.page.waitForURL(urlPattern, { timeout: this.timeout })
          : this.page.waitForLoadState('domcontentloaded'),
        this.locator.click({ timeout: this.timeout }),
      ]);
    });
  }

  /** Submit buttons commonly show a spinner and re-enable when done. */
  async clickAndWaitForCompletion(
    busySelector = '[aria-busy="true"], .spinner, .loading',
  ): Promise<void> {
    await this.step('click and wait for completion', async () => {
      await this.prepare();
      await this.locator.click({ timeout: this.timeout });
      const busy = this.page.locator(busySelector);
      await busy
        .first()
        .waitFor({ state: 'hidden', timeout: this.timeout })
        .catch(() => undefined);
    });
  }

  async isLoading(): Promise<boolean> {
    const [ariaBusy, className] = await Promise.all([
      this.getAttribute('aria-busy'),
      this.getAttribute('class'),
    ]);
    return ariaBusy === 'true' || /loading|busy|spinner/i.test(className ?? '');
  }

  async getLabel(): Promise<string> {
    const text = await this.getText();
    if (text) return text;
    return (await this.getAttribute('aria-label')) ?? (await this.getAttribute('value')) ?? '';
  }
}
