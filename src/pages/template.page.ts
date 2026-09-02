import { BasePage } from '../core/base.page';
import { ui, type UiFactory } from '../components/component.factory';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../types';

/**
 * TEMPLATE — copy this file to create a real page object, then delete the
 * placeholder selectors.
 *
 * Conventions this template encodes:
 *
 *  1. `path` and `readyIndicator` are declared, never re-derived per method.
 *  2. Components are declared as readonly fields, built once by the factory —
 *     so a selector change is a one-line edit and IDE autocomplete lists the
 *     whole page's surface.
 *  3. Methods are *business actions* ("submit the order"), not selector
 *     wrappers ("click #btn-4"). If a method reads like the DOM, it belongs in
 *     a component instead.
 *  4. No assertions about business outcomes here — those live in tests. Page
 *     objects may only assert that they themselves loaded.
 */
export class TemplatePage extends BasePage {
  protected readonly path = '/template';
  protected readonly readyIndicator: SelectorLike = '[data-testid="template-root"]';

  private readonly factory: UiFactory;

  /* Components ---------------------------------------------------------- */
  readonly searchInput;
  readonly submitButton;
  readonly resultsTable;
  readonly successToast;
  readonly filtersForm;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);

    this.searchInput = this.factory.input('[data-testid="search"]', { name: 'Search' });
    this.submitButton = this.factory.button('[data-testid="submit"]', { name: 'Submit' });
    this.resultsTable = this.factory.table('[data-testid="results"]', { name: 'Results' });
    this.successToast = this.factory.alert('[role="status"]', { name: 'Success toast' });
    this.filtersForm = this.factory.form('[data-testid="filters"]', { name: 'Filters' });
  }

  /* Business actions ----------------------------------------------------- */

  /** Runs a search and waits for the results table to refresh. */
  async search(term: string): Promise<void> {
    await this.searchInput.typeAndSettle(term);
    await this.submitButton.clickAndWaitForCompletion();
    await this.resultsTable.waitForVisible();
  }

  /** Applies a set of filters expressed as plain data. */
  async applyFilters(filters: Record<string, string | boolean>): Promise<void> {
    await this.filtersForm.fill(filters);
    await this.filtersForm.submit();
    await this.waitForIdle();
  }

  async getResultCount(): Promise<number> {
    return this.resultsTable.rowCount();
  }
}
