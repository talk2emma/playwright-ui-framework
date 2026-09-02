import type { Locator } from '@playwright/test';
import { BaseComponent } from '../../core/base.component';
import { TIMEOUTS } from '../../config/timeouts';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface AutocompleteOptions extends ComponentOptions {
  suggestionListSelector?: string;
  suggestionItemSelector?: string;
  loadingSelector?: string;
  noResultsSelector?: string;
  debounceMs?: number;
}

/**
 * Typeahead / autocomplete: type a fragment, wait for asynchronous suggestions,
 * pick one. Explicitly models the debounce and loading phases that make these
 * widgets the single most flaky control in most suites.
 */
export class Autocomplete extends BaseComponent {
  private readonly listSelector: string;
  private readonly itemSelector: string;
  private readonly loadingSelector: string;
  private readonly noResultsSelector: string;
  private readonly debounceMs: number;

  protected override get componentType(): string {
    return 'Autocomplete';
  }

  constructor(scope: Scope, selector: SelectorLike, options: AutocompleteOptions = {}) {
    super(scope, selector, options);
    this.listSelector = options.suggestionListSelector ?? '[role="listbox"], .suggestions';
    this.itemSelector = options.suggestionItemSelector ?? '[role="option"], li';
    this.loadingSelector = options.loadingSelector ?? '.loading, [aria-busy="true"]';
    this.noResultsSelector = options.noResultsSelector ?? '.no-results, [data-testid="no-results"]';
    this.debounceMs = options.debounceMs ?? TIMEOUTS.DEBOUNCE;
  }

  get suggestionList(): Locator {
    return this.page.locator(this.listSelector).first();
  }

  get suggestions(): Locator {
    return this.suggestionList.locator(this.itemSelector);
  }

  /** Types the term and waits for suggestions to finish loading. */
  async search(term: string): Promise<void> {
    await this.step(`search "${term}"`, async () => {
      await this.prepare();
      await this.locator.fill('');
      await this.locator.pressSequentially(term, { delay: 40 });
      await this.page.waitForTimeout(this.debounceMs);
      await this.waitForSuggestions();
    });
  }

  async waitForSuggestions(timeout = this.timeout): Promise<void> {
    await this.page
      .locator(this.loadingSelector)
      .first()
      .waitFor({ state: 'hidden', timeout })
      .catch(() => undefined);
    await this.suggestionList.waitFor({ state: 'visible', timeout }).catch(() => undefined);
  }

  async selectSuggestion(text: string | RegExp): Promise<void> {
    await this.step(`select suggestion "${String(text)}"`, async () => {
      const suggestion = this.suggestions.filter({ hasText: text }).first();
      await suggestion.waitFor({ state: 'visible', timeout: this.timeout });
      await suggestion.click({ timeout: this.timeout });
    });
  }

  async selectFirstSuggestion(): Promise<string> {
    return this.step('select first suggestion', async () => {
      const first = this.suggestions.first();
      await first.waitFor({ state: 'visible', timeout: this.timeout });
      const text = (await first.innerText()).trim();
      await first.click({ timeout: this.timeout });
      return text;
    });
  }

  async searchAndSelect(term: string, suggestion?: string): Promise<void> {
    await this.search(term);
    if (suggestion) await this.selectSuggestion(suggestion);
    else await this.selectFirstSuggestion();
  }

  async getSuggestions(): Promise<string[]> {
    const texts = await this.suggestions.allInnerTexts();
    return texts.map((text) => text.trim()).filter(Boolean);
  }

  async suggestionCount(): Promise<number> {
    return this.suggestions.count();
  }

  async hasNoResults(): Promise<boolean> {
    return this.page
      .locator(this.noResultsSelector)
      .first()
      .isVisible()
      .catch(() => false);
  }

  /** Keyboard flow: ArrowDown to the nth suggestion, then Enter. */
  async selectWithKeyboard(position: number): Promise<void> {
    await this.step(`select suggestion ${position} with keyboard`, async () => {
      for (let i = 0; i < position; i++) await this.locator.press('ArrowDown');
      await this.locator.press('Enter');
    });
  }

  /** The suggestion currently highlighted via aria-activedescendant. */
  async getHighlightedSuggestion(): Promise<string> {
    const activeId = await this.getAttribute('aria-activedescendant');
    if (!activeId) return '';
    return (
      await this.page
        .locator(`#${activeId}`)
        .innerText()
        .catch(() => '')
    ).trim();
  }
}
