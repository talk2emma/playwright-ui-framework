import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface CardOptions extends ComponentOptions {
  titleSelector?: string;
  bodySelector?: string;
  imageSelector?: string;
  actionSelector?: string;
  priceSelector?: string;
}

/**
 * Card / tile — product cards, dashboard widgets, result items.
 * A card is a small composite: title, body, image and actions.
 */
export class Card extends BaseComponent {
  private readonly titleSelector: string;
  private readonly bodySelector: string;
  private readonly imageSelector: string;
  private readonly actionSelector: string;
  private readonly priceSelector: string;

  protected override get componentType(): string {
    return 'Card';
  }

  constructor(scope: Scope, selector: SelectorLike, options: CardOptions = {}) {
    super(scope, selector, options);
    this.titleSelector = options.titleSelector ?? '.card-title, h2, h3, [data-testid="title"]';
    this.bodySelector = options.bodySelector ?? '.card-body, .description, p';
    this.imageSelector = options.imageSelector ?? 'img';
    this.actionSelector = options.actionSelector ?? 'button, a';
    this.priceSelector = options.priceSelector ?? '.price, [data-testid="price"]';
  }

  /** Narrows a collection of cards to the one with this title. */
  withTitle(title: string | RegExp): Card {
    return new Card(this.page, this.locator.filter({ hasText: title }).first(), {
      ...this.options,
      name: `Card "${String(title)}"`,
    });
  }

  async getTitle(): Promise<string> {
    return normalizeText(await this.locator.locator(this.titleSelector).first().innerText());
  }

  async getBody(): Promise<string> {
    return normalizeText(await this.locator.locator(this.bodySelector).first().innerText());
  }

  async getPrice(): Promise<string> {
    const price = this.locator.locator(this.priceSelector).first();
    return (await price.count()) > 0 ? normalizeText(await price.innerText()) : '';
  }

  get image(): Locator {
    return this.locator.locator(this.imageSelector).first();
  }

  async getActionLabels(): Promise<string[]> {
    return (await this.locator.locator(this.actionSelector).allInnerTexts())
      .map(normalizeText)
      .filter(Boolean);
  }

  async clickAction(name: string | RegExp): Promise<void> {
    await this.step(`click action "${String(name)}"`, async () => {
      await this.locator
        .locator(this.actionSelector)
        .filter({ hasText: name })
        .first()
        .click({ timeout: this.timeout });
    });
  }

  async isSelected(): Promise<boolean> {
    const [selected, className] = await Promise.all([
      this.getAttribute('aria-selected'),
      this.getAttribute('class'),
    ]);
    return selected === 'true' || /selected|active/i.test(className ?? '');
  }

  /** All cards in the collection this locator matches. */
  async count(): Promise<number> {
    return this.locator.count();
  }

  async getAllTitles(): Promise<string[]> {
    return (await this.locator.locator(this.titleSelector).allInnerTexts())
      .map(normalizeText)
      .filter(Boolean);
  }
}
