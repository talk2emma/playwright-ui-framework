import { BaseComponent } from '../../core/base.component';

/**
 * Range slider — native `<input type="range">` or `role="slider"`.
 * Supports keyboard, mouse-drag and direct-value strategies, because custom
 * sliders rarely honour all three.
 */
export class Slider extends BaseComponent {
  protected override get componentType(): string {
    return 'Slider';
  }

  async getValue(): Promise<number> {
    return this.locator.evaluate((element) => {
      if (element instanceof HTMLInputElement) return Number(element.value);
      return Number(element.getAttribute('aria-valuenow') ?? 0);
    });
  }

  async getMin(): Promise<number> {
    return this.locator.evaluate((element) =>
      Number(
        element instanceof HTMLInputElement
          ? element.min || 0
          : (element.getAttribute('aria-valuemin') ?? 0),
      ),
    );
  }

  async getMax(): Promise<number> {
    return this.locator.evaluate((element) =>
      Number(
        element instanceof HTMLInputElement
          ? element.max || 100
          : (element.getAttribute('aria-valuemax') ?? 100),
      ),
    );
  }

  async getStep(): Promise<number> {
    return this.locator.evaluate((element) =>
      Number(element instanceof HTMLInputElement ? element.step || 1 : 1),
    );
  }

  /** Sets the value on a native range input and fires input/change events. */
  async setValue(value: number): Promise<void> {
    await this.step(`set value ${value}`, async () => {
      await this.prepare();
      await this.locator.evaluate((element, target) => {
        if (!(element instanceof HTMLInputElement)) {
          throw new Error('setValue requires a native range input; use dragToValue instead');
        }
        // React and friends track the native setter, so assigning `value`
        // directly is ignored; calling the prototype setter is what makes the
        // framework see the change.
        // eslint-disable-next-line @typescript-eslint/unbound-method
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        setter?.call(element, String(target));
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
    });
  }

  /** Drags the handle to a proportional position — works for any slider. */
  async dragToValue(value: number): Promise<void> {
    await this.step(`drag to value ${value}`, async () => {
      await this.prepare();
      const [min, max, box] = await Promise.all([
        this.getMin(),
        this.getMax(),
        this.getBoundingBox(),
      ]);
      if (!box) throw new Error(`${this.label} has no bounding box`);
      const ratio = (value - min) / (max - min);
      const targetX = box.x + box.width * Math.min(Math.max(ratio, 0), 1);
      const centerY = box.y + box.height / 2;

      await this.page.mouse.move(box.x + box.width / 2, centerY);
      await this.page.mouse.down();
      await this.page.mouse.move(targetX, centerY, { steps: 10 });
      await this.page.mouse.up();
    });
  }

  /** Steps with arrow keys — the accessible path and the most reliable one. */
  async stepBy(steps: number): Promise<void> {
    await this.step(`step by ${steps}`, async () => {
      await this.locator.focus();
      const key = steps > 0 ? 'ArrowRight' : 'ArrowLeft';
      for (let i = 0; i < Math.abs(steps); i++) await this.page.keyboard.press(key);
    });
  }

  async setToMin(): Promise<void> {
    await this.step('set to minimum', async () => {
      await this.locator.focus();
      await this.page.keyboard.press('Home');
    });
  }

  async setToMax(): Promise<void> {
    await this.step('set to maximum', async () => {
      await this.locator.focus();
      await this.page.keyboard.press('End');
    });
  }

  /** Current value as a 0–100 percentage of the range. */
  async getPercentage(): Promise<number> {
    const [value, min, max] = await Promise.all([this.getValue(), this.getMin(), this.getMax()]);
    return ((value - min) / (max - min)) * 100;
  }
}
