import { BaseComponent } from '../../core/base.component';
import { Checkbox } from './checkbox';
import { Dropdown } from './dropdown';
import { RadioGroup } from './radio-group';
import { Select } from './select';
import { TextInput } from './text-input';
import { Toggle } from './toggle';
import { normalizeText } from '../../utils/string.utils';
import type { Locator } from '@playwright/test';

/** How a field should be driven. `auto` infers it from the DOM. */
type FieldKind = 'auto' | 'text' | 'select' | 'dropdown' | 'checkbox' | 'radio' | 'toggle' | 'file';

interface FieldSpec {
  kind?: FieldKind;
  /** Overrides label-based lookup. */
  selector?: string;
}

/** The shape `fill()` accepts. Shadows the DOM `FormData` deliberately: this
 * is a plain data object, not a multipart body. */
type FormData = Record<string, string | number | boolean | string[]>;

/**
 * Composite component for a whole `<form>`.
 *
 * `fill()` takes a plain data object keyed by field label and drives each
 * control with the right interaction — which is what stops page objects
 * accumulating twenty near-identical `setX()` methods.
 */
export class Form extends BaseComponent {
  protected override get componentType(): string {
    return 'Form';
  }

  /** Fills every field in the data object, inferring each control's type. */
  async fill(data: FormData, specs: Record<string, FieldSpec> = {}): Promise<void> {
    await this.step(`fill ${Object.keys(data).length} field(s)`, async () => {
      for (const [label, value] of Object.entries(data)) {
        await this.setField(label, value, specs[label]);
      }
    });
  }

  /** Sets one field, resolving it by label unless a selector is supplied. */
  async setField(
    label: string,
    value: string | number | boolean | string[],
    spec: FieldSpec = {},
  ): Promise<void> {
    const field = spec.selector
      ? this.locator.locator(spec.selector).first()
      : this.fieldByLabel(label);
    const kind = spec.kind && spec.kind !== 'auto' ? spec.kind : await this.inferKind(field);

    await this.step(`set "${label}" (${kind})`, async () => {
      switch (kind) {
        case 'select':
          await new Select(this.page, field, { name: label }).selectByLabel(String(value));
          break;
        case 'dropdown':
          await new Dropdown(this.page, field, { name: label }).selectOption(String(value));
          break;
        case 'checkbox':
          await new Checkbox(this.page, field, { name: label }).set(Boolean(value));
          break;
        case 'toggle':
          await new Toggle(this.page, field, { name: label }).set(Boolean(value));
          break;
        case 'radio':
          await new RadioGroup(this.page, field, { name: label }).selectByLabel(String(value));
          break;
        case 'file':
          await field.setInputFiles(Array.isArray(value) ? value : [String(value)]);
          break;
        default:
          await new TextInput(this.page, field, { name: label }).type(String(value));
      }
    });
  }

  /** Locates a control by its visible label, with sensible fallbacks. */
  fieldByLabel(label: string): Locator {
    return this.locator
      .getByLabel(label, { exact: false })
      .or(this.locator.getByPlaceholder(label, { exact: false }))
      .or(this.locator.locator(`[name="${label}"], [data-testid="${label}"]`))
      .first();
  }

  async submit(submitSelector = 'button[type="submit"], input[type="submit"]'): Promise<void> {
    await this.step('submit', async () => {
      await this.locator.locator(submitSelector).first().click({ timeout: this.timeout });
    });
  }

  async reset(resetSelector = 'button[type="reset"]'): Promise<void> {
    await this.step('reset', async () => {
      const reset = this.locator.locator(resetSelector).first();
      if ((await reset.count()) > 0) await reset.click({ timeout: this.timeout });
      else await this.locator.evaluate((element) => (element as HTMLFormElement).reset());
    });
  }

  /** Current values of every named control — for round-trip assertions. */
  async getValues(): Promise<Record<string, string>> {
    return this.locator.evaluate((element) => {
      const result: Record<string, string> = {};
      const form = element as HTMLFormElement;
      for (const control of Array.from(form.elements)) {
        const named = control as HTMLInputElement;
        if (!named.name) continue;
        if (named.type === 'checkbox' || named.type === 'radio') {
          if (named.checked) result[named.name] = named.value;
        } else {
          result[named.name] = named.value;
        }
      }
      return result;
    });
  }

  /** Every validation message the form is currently showing. */
  async getErrors(errorSelector = '[role="alert"], .error, .invalid-feedback'): Promise<string[]> {
    const texts = await this.locator.locator(errorSelector).allInnerTexts();
    return texts.map(normalizeText).filter(Boolean);
  }

  async hasErrors(): Promise<boolean> {
    return (await this.getErrors()).length > 0;
  }

  /** Browser-level constraint validation for the whole form. */
  async isValid(): Promise<boolean> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLFormElement ? element.checkValidity() : true,
    );
  }

  /** Names of every control the browser considers invalid. */
  async getInvalidFields(): Promise<string[]> {
    return this.locator.evaluate((element) => {
      if (!(element instanceof HTMLFormElement)) return [];
      return Array.from(element.elements)
        .filter((control): control is HTMLInputElement => 'checkValidity' in control)
        .filter((control) => !control.checkValidity())
        .map((control) => control.name || control.id);
    });
  }

  async fieldCount(): Promise<number> {
    return this.locator.locator('input, select, textarea').count();
  }

  /** Tab order as the keyboard sees it — catches broken focus management. */
  async getTabOrder(): Promise<string[]> {
    return this.locator.evaluate((element) =>
      Array.from(
        element.querySelectorAll<HTMLElement>(
          'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])',
        ),
      )
        .filter((node) => !node.hasAttribute('disabled'))
        .map(
          (node) =>
            node.getAttribute('name') ?? node.getAttribute('id') ?? node.tagName.toLowerCase(),
        ),
    );
  }

  private async inferKind(field: Locator): Promise<FieldKind> {
    return field.evaluate((element): FieldKind => {
      const tag = element.tagName.toLowerCase();
      if (tag === 'select') return 'select';
      if (tag === 'textarea') return 'text';
      const role = element.getAttribute('role');
      if (role === 'switch') return 'toggle';
      if (role === 'combobox' || role === 'listbox') return 'dropdown';
      if (role === 'radiogroup') return 'radio';
      if (element instanceof HTMLInputElement) {
        if (element.type === 'checkbox') return 'checkbox';
        if (element.type === 'radio') return 'radio';
        if (element.type === 'file') return 'file';
      }
      return 'text';
    });
  }
}
