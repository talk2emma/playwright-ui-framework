import { BaseComponent } from '../../core/base.component';

/** `<input type="color">` and custom colour swatch pickers. */
export class ColorPicker extends BaseComponent {
  protected override get componentType(): string {
    return 'ColorPicker';
  }

  /** Sets a hex colour on a native input, firing the events frameworks listen for. */
  async setColor(hex: string): Promise<void> {
    await this.step(`set colour ${hex}`, async () => {
      await this.prepare();
      await this.locator.evaluate((element, value) => {
        if (!(element instanceof HTMLInputElement)) throw new Error('Not a native colour input');
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }, hex);
    });
  }

  async getColor(): Promise<string> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLInputElement
        ? element.value
        : window.getComputedStyle(element).backgroundColor,
    );
  }

  /** Picks a named swatch from a custom palette. */
  async pickSwatch(colorName: string, swatchSelector = '.swatch, [data-color]'): Promise<void> {
    await this.step(`pick swatch "${colorName}"`, async () => {
      const swatch = this.page
        .locator(swatchSelector)
        .filter({ has: this.page.locator(`[data-color="${colorName}"], [title="${colorName}"]`) })
        .first();
      const target =
        (await swatch.count()) > 0 ? swatch : this.page.locator(`[title="${colorName}"]`);
      await target.first().click({ timeout: this.timeout });
    });
  }

  /** Computed RGB of the rendered swatch — what the user actually sees. */
  async getRenderedColor(): Promise<string> {
    return this.getCssValue('background-color');
  }
}
