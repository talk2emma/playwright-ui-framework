import { BaseComponent } from '../../core/base.component';

/**
 * Native `<select>`. For framework dropdowns that render a listbox in a
 * portal, use `Dropdown` instead.
 */
export class Select extends BaseComponent {
  protected override get componentType(): string {
    return 'Select';
  }

  async selectByValue(value: string | string[]): Promise<void> {
    await this.step(`select value ${JSON.stringify(value)}`, async () => {
      await this.prepare();
      await this.locator.selectOption(
        Array.isArray(value) ? value.map((v) => ({ value: v })) : { value },
        { timeout: this.timeout },
      );
    });
  }

  async selectByLabel(label: string | string[]): Promise<void> {
    await this.step(`select label ${JSON.stringify(label)}`, async () => {
      await this.prepare();
      await this.locator.selectOption(
        Array.isArray(label) ? label.map((l) => ({ label: l })) : { label },
        { timeout: this.timeout },
      );
    });
  }

  async selectByIndex(index: number): Promise<void> {
    await this.step(`select index ${index}`, async () => {
      await this.prepare();
      await this.locator.selectOption({ index }, { timeout: this.timeout });
    });
  }

  async getSelectedValue(): Promise<string> {
    return this.locator.inputValue();
  }

  async getSelectedLabel(): Promise<string> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLSelectElement ? (element.selectedOptions[0]?.text.trim() ?? '') : '',
    );
  }

  async getSelectedValues(): Promise<string[]> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLSelectElement
        ? Array.from(element.selectedOptions).map((option) => option.value)
        : [],
    );
  }

  async getOptions(): Promise<Array<{ value: string; label: string; disabled: boolean }>> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLSelectElement
        ? Array.from(element.options).map((option) => ({
            value: option.value,
            label: option.text.trim(),
            disabled: option.disabled,
          }))
        : [],
    );
  }

  async getOptionLabels(): Promise<string[]> {
    return (await this.getOptions()).map((option) => option.label);
  }

  async optionCount(): Promise<number> {
    return this.locator.locator('option').count();
  }

  async isMultiple(): Promise<boolean> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLSelectElement ? element.multiple : false,
    );
  }

  async hasOption(label: string): Promise<boolean> {
    return (await this.getOptionLabels()).includes(label);
  }

  async clearSelection(): Promise<void> {
    await this.step('clear selection', async () => {
      await this.locator.selectOption([], { timeout: this.timeout });
    });
  }
}
