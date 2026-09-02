import { BaseComponent } from '../../core/base.component';

/**
 * Checkbox — native `<input type="checkbox">` or an ARIA checkbox.
 * Handles the tri-state (`indeterminate`) case that most helpers forget.
 */
export class Checkbox extends BaseComponent {
  protected override get componentType(): string {
    return 'Checkbox';
  }

  async check(): Promise<void> {
    await this.step('check', async () => {
      await this.prepare();
      if (await this.isCheckedState()) return;
      await this.locator.check({ timeout: this.timeout }).catch(async () => {
        // ARIA checkboxes are not checkable by Playwright's strict definition.
        await this.locator.click({ timeout: this.timeout });
      });
    });
  }

  async uncheck(): Promise<void> {
    await this.step('uncheck', async () => {
      await this.prepare();
      if (!(await this.isCheckedState())) return;
      await this.locator.uncheck({ timeout: this.timeout }).catch(async () => {
        await this.locator.click({ timeout: this.timeout });
      });
    });
  }

  async toggle(): Promise<void> {
    await this.step('toggle', async () => {
      await this.prepare();
      await this.locator.click({ timeout: this.timeout });
    });
  }

  async set(checked: boolean): Promise<void> {
    if (checked) await this.check();
    else await this.uncheck();
  }

  /** Reads checked state from the native property or `aria-checked`. */
  async isCheckedState(): Promise<boolean> {
    return this.locator.evaluate((element) => {
      if (element instanceof HTMLInputElement) return element.checked;
      return element.getAttribute('aria-checked') === 'true';
    });
  }

  /** Partially-selected parent checkbox, e.g. "select all" over a mixed list. */
  async isIndeterminate(): Promise<boolean> {
    return this.locator.evaluate((element) => {
      if (element instanceof HTMLInputElement) return element.indeterminate;
      return element.getAttribute('aria-checked') === 'mixed';
    });
  }

  async getLabelText(): Promise<string> {
    return this.locator.evaluate((element) => {
      const id = element.getAttribute('id');
      const explicit = id ? document.querySelector(`label[for="${id}"]`) : null;
      const wrapping = element.closest('label');
      return (
        explicit?.textContent?.trim() ??
        wrapping?.textContent?.trim() ??
        element.getAttribute('aria-label') ??
        ''
      );
    });
  }

  async expectChecked(): Promise<void> {
    await this.step('assert checked', async () => {
      const checked = await this.isCheckedState();
      if (!checked) throw new Error(`${this.label} expected to be checked but was not`);
    });
  }
}
