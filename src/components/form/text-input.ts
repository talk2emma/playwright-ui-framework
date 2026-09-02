import { BaseComponent } from '../../core/base.component';
import { TIMEOUTS } from '../../config/timeouts';
import type { FillOptions } from '../../types';

/**
 * Single-line inputs of every flavour (text, email, password, number, tel,
 * url, search) plus `contenteditable` fields.
 */
export class TextInput extends BaseComponent {
  protected override get componentType(): string {
    return 'TextInput';
  }

  /**
   * Sets the value. `pressSequentially` types key by key — needed for inputs
   * with masks, debounced search or per-keystroke validation.
   */
  async type(value: string, options: FillOptions = {}): Promise<void> {
    await this.step(`type "${truncateForLog(value)}"`, async () => {
      await this.prepare();
      if (options.clearFirst !== false) {
        await this.locator.fill('', { timeout: this.timeout, force: options.force ?? false });
      }
      if (options.pressSequentially) {
        await this.locator.pressSequentially(value, {
          delay: options.delay ?? 30,
          timeout: this.timeout,
        });
      } else {
        await this.locator.fill(value, { timeout: this.timeout, force: options.force ?? false });
      }
      if (options.validate) {
        await this.expectValue(value);
      }
    });
  }

  /** Appends to the existing value instead of replacing it. */
  async append(value: string): Promise<void> {
    await this.step(`append "${truncateForLog(value)}"`, async () => {
      await this.prepare();
      await this.locator.focus();
      await this.locator.press('End');
      await this.locator.pressSequentially(value, { delay: 20 });
    });
  }

  async clear(): Promise<void> {
    await this.step('clear', async () => {
      await this.prepare();
      await this.locator.clear({ timeout: this.timeout });
    });
  }

  /** Clears using keyboard only — for fields that ignore programmatic fill. */
  async clearWithKeyboard(): Promise<void> {
    await this.step('clear with keyboard', async () => {
      await this.locator.focus();
      await this.locator.press('ControlOrMeta+a');
      await this.locator.press('Delete');
    });
  }

  /** Types then waits out the debounce — search boxes and typeaheads. */
  async typeAndSettle(value: string, debounceMs = TIMEOUTS.DEBOUNCE): Promise<void> {
    await this.type(value, { pressSequentially: true });
    await this.page.waitForTimeout(debounceMs);
  }

  async submit(): Promise<void> {
    await this.step('submit via Enter', async () => {
      await this.locator.press('Enter', { timeout: this.timeout });
    });
  }

  /** Current text value of the field. */
  async getValue(): Promise<string> {
    return this.getInputValue();
  }

  async getPlaceholder(): Promise<string | null> {
    return this.getAttribute('placeholder');
  }

  async getInputType(): Promise<string> {
    return (await this.getAttribute('type')) ?? 'text';
  }

  async getMaxLength(): Promise<number | null> {
    const value = await this.getAttribute('maxlength');
    return value === null ? null : Number(value);
  }

  async isRequired(): Promise<boolean> {
    const [required, ariaRequired] = await Promise.all([
      this.getAttribute('required'),
      this.getAttribute('aria-required'),
    ]);
    return required !== null || ariaRequired === 'true';
  }

  async isReadOnly(): Promise<boolean> {
    const [readonly, ariaReadonly] = await Promise.all([
      this.getAttribute('readonly'),
      this.getAttribute('aria-readonly'),
    ]);
    return readonly !== null || ariaReadonly === 'true';
  }

  /* --------------------------- validation state --------------------------- */

  /** True when the browser's constraint validation marks the field invalid. */
  async isValid(): Promise<boolean> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? element.checkValidity()
        : true,
    );
  }

  /** The native browser validation message, e.g. "Please fill out this field". */
  async getValidationMessage(): Promise<string> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? element.validationMessage
        : '',
    );
  }

  /** The application's own error text, resolved via aria-describedby / aria-errormessage. */
  async getErrorMessage(): Promise<string> {
    return this.locator.evaluate((element) => {
      const ids =
        element.getAttribute('aria-errormessage') ?? element.getAttribute('aria-describedby') ?? '';
      const texts = ids
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '');
      return texts.filter(Boolean).join(' ');
    });
  }

  async hasError(): Promise<boolean> {
    const [ariaInvalid, className, message] = await Promise.all([
      this.getAttribute('aria-invalid'),
      this.getAttribute('class'),
      this.getErrorMessage(),
    ]);
    return (
      ariaInvalid === 'true' || /error|invalid|danger/i.test(className ?? '') || message !== ''
    );
  }

  /** Pastes text via the clipboard API — some fields behave differently on paste. */
  async paste(value: string): Promise<void> {
    await this.step('paste value', async () => {
      await this.locator.focus();
      await this.page.evaluate((text) => navigator.clipboard.writeText(text), value);
      await this.locator.press('ControlOrMeta+v');
    });
  }
}

function truncateForLog(value: string): string {
  return value.length > 40 ? `${value.slice(0, 39)}…` : value;
}
