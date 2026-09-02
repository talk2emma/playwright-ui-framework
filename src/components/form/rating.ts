import type { Locator } from '@playwright/test';
import { BaseComponent } from '../../core/base.component';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface RatingOptions extends ComponentOptions {
  itemSelector?: string;
  selectedClassPattern?: RegExp;
}

/** Star / heart rating control. */
export class Rating extends BaseComponent {
  private readonly itemSelector: string;
  private readonly selectedPattern: RegExp;

  protected override get componentType(): string {
    return 'Rating';
  }

  constructor(scope: Scope, selector: SelectorLike, options: RatingOptions = {}) {
    super(scope, selector, options);
    this.itemSelector = options.itemSelector ?? '[role="radio"], .star, li, svg';
    this.selectedPattern = options.selectedClassPattern ?? /(selected|active|filled|checked)/i;
  }

  get items(): Locator {
    return this.locator.locator(this.itemSelector);
  }

  /** Rates by clicking the nth star (1-based). */
  async rate(value: number): Promise<void> {
    await this.step(`rate ${value}`, async () => {
      await this.prepare();
      await this.items.nth(value - 1).click({ timeout: this.timeout });
    });
  }

  async getRating(): Promise<number> {
    const ariaValue = await this.getAttribute('aria-valuenow');
    if (ariaValue !== null) return Number(ariaValue);

    const classes = await this.items.evaluateAll((elements) =>
      elements.map(
        (element) => `${element.className} ${element.getAttribute('aria-checked') ?? ''}`,
      ),
    );
    return classes.filter((value) => this.selectedPattern.test(value)).length;
  }

  async getMaxRating(): Promise<number> {
    const ariaMax = await this.getAttribute('aria-valuemax');
    return ariaMax !== null ? Number(ariaMax) : this.items.count();
  }

  /** Hover preview — many rating widgets show a different value on hover. */
  async hoverRating(value: number): Promise<void> {
    await this.step(`hover rating ${value}`, async () => {
      await this.items.nth(value - 1).hover({ timeout: this.timeout });
    });
  }

  async isReadOnly(): Promise<boolean> {
    const [readonly, disabled] = await Promise.all([
      this.getAttribute('aria-readonly'),
      this.getAttribute('aria-disabled'),
    ]);
    return readonly === 'true' || disabled === 'true';
  }

  async clear(): Promise<void> {
    await this.step('clear rating', async () => {
      await this.locator.focus();
      await this.page.keyboard.press('Home');
    });
  }
}
