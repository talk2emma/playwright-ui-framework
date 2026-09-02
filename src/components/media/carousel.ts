import { BaseComponent } from '../../core/base.component';
import { TIMEOUTS } from '../../config/timeouts';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface CarouselOptions extends ComponentOptions {
  slideSelector?: string;
  nextSelector?: string;
  previousSelector?: string;
  indicatorSelector?: string;
  activeSlidePattern?: RegExp;
}

/** Image/content carousel with arrows, indicators and (often) autoplay. */
export class Carousel extends BaseComponent {
  private readonly slideSelector: string;
  private readonly nextSelector: string;
  private readonly previousSelector: string;
  private readonly indicatorSelector: string;
  private readonly activePattern: RegExp;

  protected override get componentType(): string {
    return 'Carousel';
  }

  constructor(scope: Scope, selector: SelectorLike, options: CarouselOptions = {}) {
    super(scope, selector, options);
    this.slideSelector = options.slideSelector ?? '.slide, [role="group"], li';
    this.nextSelector = options.nextSelector ?? '[aria-label*="next" i], .next';
    this.previousSelector = options.previousSelector ?? '[aria-label*="prev" i], .prev';
    this.indicatorSelector = options.indicatorSelector ?? '.indicator, .dot, [role="tab"]';
    this.activePattern = options.activeSlidePattern ?? /(active|current|selected)/i;
  }

  get slides(): Locator {
    return this.locator.locator(this.slideSelector);
  }

  get indicators(): Locator {
    return this.locator.locator(this.indicatorSelector);
  }

  async next(): Promise<void> {
    await this.step('next slide', async () => {
      await this.locator.locator(this.nextSelector).first().click({ timeout: this.timeout });
      await this.page.waitForTimeout(TIMEOUTS.ANIMATION);
    });
  }

  async previous(): Promise<void> {
    await this.step('previous slide', async () => {
      await this.locator.locator(this.previousSelector).first().click({ timeout: this.timeout });
      await this.page.waitForTimeout(TIMEOUTS.ANIMATION);
    });
  }

  async goToSlide(index: number): Promise<void> {
    await this.step(`go to slide ${index}`, async () => {
      const indicator = this.indicators.nth(index - 1);
      if ((await indicator.count()) > 0) {
        await indicator.click({ timeout: this.timeout });
      } else {
        const current = await this.getCurrentSlideIndex();
        const steps = index - current;
        for (let i = 0; i < Math.abs(steps); i++) {
          if (steps > 0) await this.next();
          else await this.previous();
        }
      }
      await this.page.waitForTimeout(TIMEOUTS.ANIMATION);
    });
  }

  /** Current slide number, 1-based. */
  async getCurrentSlideIndex(): Promise<number> {
    const classes = await this.slides.evaluateAll((elements) =>
      elements.map(
        (element) =>
          `${element.className} ${element.getAttribute('aria-hidden') === 'false' ? 'active' : ''}`,
      ),
    );
    const index = classes.findIndex((value) => this.activePattern.test(value));
    return index === -1 ? 1 : index + 1;
  }

  async slideCount(): Promise<number> {
    return this.slides.count();
  }

  async getCurrentSlideText(): Promise<string> {
    return (await this.slides.nth((await this.getCurrentSlideIndex()) - 1).innerText()).trim();
  }

  /** Confirms autoplay advances the carousel on its own. */
  async waitForAutoAdvance(timeout = TIMEOUTS.MEDIUM): Promise<boolean> {
    const start = await this.getCurrentSlideIndex();
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(500);
      if ((await this.getCurrentSlideIndex()) !== start) return true;
    }
    return false;
  }

  /** Swipes horizontally — the mobile interaction path. */
  async swipe(direction: 'left' | 'right'): Promise<void> {
    await this.step(`swipe ${direction}`, async () => {
      const box = await this.getBoundingBox();
      if (!box) throw new Error(`${this.label} has no bounding box`);
      const centerY = box.y + box.height / 2;
      const startX = direction === 'left' ? box.x + box.width * 0.8 : box.x + box.width * 0.2;
      const endX = direction === 'left' ? box.x + box.width * 0.2 : box.x + box.width * 0.8;

      await this.page.mouse.move(startX, centerY);
      await this.page.mouse.down();
      await this.page.mouse.move(endX, centerY, { steps: 12 });
      await this.page.mouse.up();
      await this.page.waitForTimeout(TIMEOUTS.ANIMATION);
    });
  }
}
