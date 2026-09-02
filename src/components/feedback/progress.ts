import { BaseComponent } from '../../core/base.component';
import { TIMEOUTS } from '../../config/timeouts';
import { waitUntil } from '../../utils/retry.utils';

/** Determinate/indeterminate progress bar. */
export class ProgressBar extends BaseComponent {
  protected override get componentType(): string {
    return 'ProgressBar';
  }

  async getValue(): Promise<number> {
    return this.locator.evaluate((element) => {
      if (element instanceof HTMLProgressElement) return element.value;
      return Number(element.getAttribute('aria-valuenow') ?? 0);
    });
  }

  async getMax(): Promise<number> {
    return this.locator.evaluate((element) => {
      if (element instanceof HTMLProgressElement) return element.max;
      return Number(element.getAttribute('aria-valuemax') ?? 100);
    });
  }

  async getPercentage(): Promise<number> {
    const [value, max] = await Promise.all([this.getValue(), this.getMax()]);
    return max === 0 ? 0 : (value / max) * 100;
  }

  async isIndeterminate(): Promise<boolean> {
    return (await this.getAttribute('aria-valuenow')) === null;
  }

  async waitForComplete(timeout = TIMEOUTS.EXTRA_LONG): Promise<void> {
    await this.step('wait for completion', async () => {
      await waitUntil(async () => (await this.getPercentage()) >= 100, {
        timeout,
        message: `${this.label} did not reach 100%`,
      });
    });
  }

  async waitForProgress(minimumPercent: number, timeout = TIMEOUTS.LONG): Promise<void> {
    await waitUntil(async () => (await this.getPercentage()) >= minimumPercent, {
      timeout,
      message: `${this.label} did not reach ${minimumPercent}%`,
    });
  }
}

/** Spinner / skeleton loader — an element whose whole job is to disappear. */
export class Loader extends BaseComponent {
  protected override get componentType(): string {
    return 'Loader';
  }

  async waitForFinish(timeout = TIMEOUTS.LONG): Promise<void> {
    await this.step('wait to finish', async () => {
      await this.locator
        .first()
        .waitFor({ state: 'visible', timeout: TIMEOUTS.INSTANT })
        .catch(() => undefined);
      await this.locator.first().waitFor({ state: 'hidden', timeout });
    });
  }

  async isLoading(): Promise<boolean> {
    return this.locator
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Runs an action and waits for the spinner it triggers to clear. */
  async around(action: () => Promise<void>, timeout = TIMEOUTS.LONG): Promise<void> {
    await action();
    await this.waitForFinish(timeout);
  }
}
