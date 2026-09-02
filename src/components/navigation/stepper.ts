import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface StepperOptions extends ComponentOptions {
  stepSelector?: string;
  nextSelector?: string;
  backSelector?: string;
  finishSelector?: string;
}

/** Multi-step wizard / stepper: current step, completion state, and traversal. */
export class Stepper extends BaseComponent {
  private readonly stepSelector: string;
  private readonly nextSelector: string;
  private readonly backSelector: string;
  private readonly finishSelector: string;

  protected override get componentType(): string {
    return 'Stepper';
  }

  constructor(scope: Scope, selector: SelectorLike, options: StepperOptions = {}) {
    super(scope, selector, options);
    this.stepSelector = options.stepSelector ?? '.step, [role="tab"], li';
    this.nextSelector = options.nextSelector ?? 'button:has-text("Next")';
    this.backSelector = options.backSelector ?? 'button:has-text("Back")';
    this.finishSelector =
      options.finishSelector ?? 'button:has-text("Finish"), button:has-text("Submit")';
  }

  get steps(): Locator {
    return this.locator.locator(this.stepSelector);
  }

  async next(): Promise<void> {
    await this.step('next step', async () => {
      await this.page.locator(this.nextSelector).first().click({ timeout: this.timeout });
    });
  }

  async back(): Promise<void> {
    await this.step('previous step', async () => {
      await this.page.locator(this.backSelector).first().click({ timeout: this.timeout });
    });
  }

  async finish(): Promise<void> {
    await this.step('finish wizard', async () => {
      await this.page.locator(this.finishSelector).first().click({ timeout: this.timeout });
    });
  }

  /** Current step number, 1-based. */
  async getCurrentStep(): Promise<number> {
    const states = await this.steps.evaluateAll((elements) =>
      elements.map(
        (element) =>
          `${element.className} ${element.getAttribute('aria-selected') ?? ''} ${element.getAttribute('aria-current') ?? ''}`,
      ),
    );
    const index = states.findIndex((state) => /(active|current|true)/i.test(state));
    return index === -1 ? 1 : index + 1;
  }

  async getCurrentStepName(): Promise<string> {
    return normalizeText(await this.steps.nth((await this.getCurrentStep()) - 1).innerText());
  }

  async getStepNames(): Promise<string[]> {
    return (await this.steps.allInnerTexts()).map(normalizeText).filter(Boolean);
  }

  async stepCount(): Promise<number> {
    return this.steps.count();
  }

  async isStepCompleted(stepNumber: number): Promise<boolean> {
    const step = this.steps.nth(stepNumber - 1);
    const className = (await step.getAttribute('class')) ?? '';
    return /complete|done|finished/i.test(className);
  }

  async isStepDisabled(stepNumber: number): Promise<boolean> {
    const step = this.steps.nth(stepNumber - 1);
    const [ariaDisabled, className] = await Promise.all([
      step.getAttribute('aria-disabled'),
      step.getAttribute('class'),
    ]);
    return ariaDisabled === 'true' || /disabled/i.test(className ?? '');
  }

  /** Jumps directly to a step when the stepper allows non-linear navigation. */
  async goToStep(stepNumber: number): Promise<void> {
    await this.step(`go to step ${stepNumber}`, async () => {
      await this.steps.nth(stepNumber - 1).click({ timeout: this.timeout });
    });
  }

  async isLastStep(): Promise<boolean> {
    return (await this.getCurrentStep()) === (await this.stepCount());
  }
}
