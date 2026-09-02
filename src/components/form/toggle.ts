import { BaseComponent } from '../../core/base.component';

/**
 * Toggle / switch control — `role="switch"`, a styled checkbox, or a div pair.
 */
export class Toggle extends BaseComponent {
  protected override get componentType(): string {
    return 'Toggle';
  }

  async isOn(): Promise<boolean> {
    return this.locator.evaluate((element) => {
      if (element instanceof HTMLInputElement) return element.checked;
      const ariaChecked = element.getAttribute('aria-checked');
      if (ariaChecked !== null) return ariaChecked === 'true';
      const ariaPressed = element.getAttribute('aria-pressed');
      if (ariaPressed !== null) return ariaPressed === 'true';
      const className = typeof element.className === 'string' ? element.className : '';
      return /(^|\s)(on|active|checked|enabled)(\s|$)/i.test(className);
    });
  }

  async turnOn(): Promise<void> {
    await this.step('turn on', async () => {
      await this.prepare();
      if (await this.isOn()) return;
      await this.locator.click({ timeout: this.timeout });
    });
  }

  async turnOff(): Promise<void> {
    await this.step('turn off', async () => {
      await this.prepare();
      if (!(await this.isOn())) return;
      await this.locator.click({ timeout: this.timeout });
    });
  }

  async set(state: boolean): Promise<void> {
    if (state) await this.turnOn();
    else await this.turnOff();
  }

  async toggle(): Promise<boolean> {
    return this.step('toggle', async () => {
      await this.prepare();
      await this.locator.click({ timeout: this.timeout });
      return this.isOn();
    });
  }

  /** Space is the accessible activation key for a switch. */
  async toggleWithKeyboard(): Promise<void> {
    await this.step('toggle with Space', async () => {
      await this.locator.focus();
      await this.page.keyboard.press('Space');
    });
  }
}
