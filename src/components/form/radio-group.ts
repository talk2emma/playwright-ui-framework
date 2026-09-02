import type { Locator } from '@playwright/test';
import { BaseComponent } from '../../core/base.component';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

/**
 * A set of mutually-exclusive radio options, addressed by value, label or index.
 *
 * The group locator should point at the container (`[role="radiogroup"]`,
 * a fieldset, or any wrapper); options are discovered beneath it.
 */
export class RadioGroup extends BaseComponent {
  private readonly optionSelector: string;

  protected override get componentType(): string {
    return 'RadioGroup';
  }

  constructor(
    scope: Scope,
    selector: SelectorLike,
    options: ComponentOptions & { optionSelector?: string } = {},
  ) {
    super(scope, selector, options);
    this.optionSelector = options.optionSelector ?? 'input[type="radio"], [role="radio"]';
  }

  private get optionLocator(): Locator {
    return this.locator.locator(this.optionSelector);
  }

  async selectByValue(value: string): Promise<void> {
    await this.step(`select value "${value}"`, async () => {
      const option = this.optionLocator.and(this.page.locator(`[value="${value}"]`));
      await option
        .first()
        .check({ timeout: this.timeout })
        .catch(() => option.first().click());
    });
  }

  async selectByLabel(label: string | RegExp): Promise<void> {
    await this.step(`select label "${String(label)}"`, async () => {
      const byLabel = this.locator.getByLabel(label);
      if ((await byLabel.count()) > 0) {
        await byLabel
          .first()
          .check({ timeout: this.timeout })
          .catch(() => byLabel.first().click());
        return;
      }
      // Fall back to the option whose surrounding text matches.
      const row = this.locator.locator('label, [role="radio"]').filter({ hasText: label });
      await row.first().click({ timeout: this.timeout });
    });
  }

  async selectByIndex(index: number): Promise<void> {
    await this.step(`select index ${index}`, async () => {
      const option = this.optionLocator.nth(index);
      await option.check({ timeout: this.timeout }).catch(() => option.click());
    });
  }

  async getSelectedValue(): Promise<string | null> {
    const options = await this.optionLocator.all();
    for (const option of options) {
      const checked = await option.evaluate((element) =>
        element instanceof HTMLInputElement
          ? element.checked
          : element.getAttribute('aria-checked') === 'true',
      );
      if (checked) return option.getAttribute('value');
    }
    return null;
  }

  async getSelectedLabel(): Promise<string> {
    return this.locator.evaluate((group) => {
      const selected = group.querySelector<HTMLInputElement>(
        'input[type="radio"]:checked, [role="radio"][aria-checked="true"]',
      );
      if (!selected) return '';
      const id = selected.getAttribute('id');
      const explicit = id ? document.querySelector(`label[for="${id}"]`) : null;
      return (
        explicit?.textContent?.trim() ??
        selected.closest('label')?.textContent?.trim() ??
        selected.getAttribute('aria-label') ??
        ''
      );
    });
  }

  async getOptionValues(): Promise<string[]> {
    return this.optionLocator.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('value') ?? ''),
    );
  }

  async getOptionLabels(): Promise<string[]> {
    return this.locator.evaluate((group) =>
      Array.from(group.querySelectorAll('input[type="radio"], [role="radio"]')).map((option) => {
        const id = option.getAttribute('id');
        const explicit = id ? document.querySelector(`label[for="${id}"]`) : null;
        return (
          explicit?.textContent?.trim() ??
          option.closest('label')?.textContent?.trim() ??
          option.getAttribute('aria-label') ??
          ''
        );
      }),
    );
  }

  async optionCount(): Promise<number> {
    return this.optionLocator.count();
  }

  /** Arrow-key navigation is the accessible way to change a radio group. */
  async selectWithKeyboard(direction: 'next' | 'previous'): Promise<void> {
    await this.step(`select ${direction} option with keyboard`, async () => {
      const key = direction === 'next' ? 'ArrowDown' : 'ArrowUp';
      await this.optionLocator.first().focus();
      await this.page.keyboard.press(key);
    });
  }
}
