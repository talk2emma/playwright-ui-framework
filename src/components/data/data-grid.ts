import { Table, type TableOptions } from './table';
import { TIMEOUTS } from '../../config/timeouts';
import type { SelectorLike, TableRow } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface DataGridOptions extends TableOptions {
  loadingSelector?: string;
  emptyStateSelector?: string;
  virtualScrollContainerSelector?: string;
  filterInputSelector?: string;
  columnMenuSelector?: string;
}

/**
 * Enterprise data grid (AG Grid, MUI DataGrid, Kendo, PrimeNG).
 *
 * Differs from `Table` in three ways that matter: rows are `role="row"` divs,
 * content loads asynchronously, and only the visible window exists in the DOM.
 */
export class DataGrid extends Table {
  private readonly loadingSelector: string;
  private readonly emptyStateSelector: string;
  private readonly virtualContainerSelector: string;
  private readonly filterInputSelector: string;

  protected override get componentType(): string {
    return 'DataGrid';
  }

  constructor(scope: Scope, selector: SelectorLike, options: DataGridOptions = {}) {
    super(scope, selector, {
      headerSelector: '[role="rowgroup"]:first-child, .grid-header',
      rowSelector: '[role="row"]:not([role="row"]:has([role="columnheader"]))',
      cellSelector: '[role="gridcell"], [role="cell"]',
      headerCellSelector: '[role="columnheader"]',
      ...options,
    });
    this.loadingSelector = options.loadingSelector ?? '.loading-overlay, [aria-busy="true"]';
    this.emptyStateSelector = options.emptyStateSelector ?? '.no-rows, .empty-state';
    this.virtualContainerSelector =
      options.virtualScrollContainerSelector ?? '.viewport, [role="rowgroup"]';
    this.filterInputSelector = options.filterInputSelector ?? 'input[type="text"], .filter-input';
  }

  /** Waits for the grid's own loading overlay to clear. */
  async waitForData(timeout = TIMEOUTS.LONG): Promise<void> {
    await this.step('wait for data', async () => {
      const overlay = this.locator.locator(this.loadingSelector).first();
      await overlay.waitFor({ state: 'hidden', timeout }).catch(() => undefined);
      await this.page.waitForLoadState('networkidle', { timeout }).catch(() => undefined);
    });
  }

  async isEmptyState(): Promise<boolean> {
    return this.locator
      .locator(this.emptyStateSelector)
      .first()
      .isVisible()
      .catch(() => false);
  }

  /**
   * Scrolls a virtualised grid until the row is rendered, then returns it.
   * Virtualisation means "not in the DOM" does not mean "not in the data".
   */
  async scrollToRow(criteria: Partial<TableRow>, maxScrolls = 40): Promise<number> {
    return this.step(`scroll to row ${JSON.stringify(criteria)}`, async () => {
      const container = this.locator.locator(this.virtualContainerSelector).first();
      for (let attempt = 0; attempt < maxScrolls; attempt++) {
        const index = await this.findRowIndex(criteria);
        if (index !== -1) {
          await this.rows.nth(index).scrollIntoViewIfNeeded();
          return index;
        }
        await container.evaluate((element) => element.scrollBy(0, element.clientHeight * 0.8));
        await this.page.waitForTimeout(150);
      }
      throw new Error(`${this.label}: row ${JSON.stringify(criteria)} not found after scrolling`);
    });
  }

  /** Loads every row of a virtualised grid by scrolling to the bottom. */
  async getAllRowsVirtualized(maxScrolls = 100): Promise<TableRow[]> {
    const container = this.locator.locator(this.virtualContainerSelector).first();
    const seen = new Map<string, TableRow>();

    for (let attempt = 0; attempt < maxScrolls; attempt++) {
      for (const row of await this.getAllRows()) seen.set(JSON.stringify(row), row);
      const atBottom = await container.evaluate((element) => {
        const before = element.scrollTop;
        element.scrollBy(0, element.clientHeight * 0.8);
        return element.scrollTop === before;
      });
      await this.page.waitForTimeout(150);
      if (atBottom) break;
    }
    return [...seen.values()];
  }

  /** Types into a column's filter box and waits for the grid to refresh. */
  async filterColumn(columnName: string, value: string): Promise<void> {
    await this.step(`filter "${columnName}" by "${value}"`, async () => {
      const index = await this.getColumnIndex(columnName);
      const input = this.headerCells.nth(index).locator(this.filterInputSelector).first();
      await input.fill(value, { timeout: this.timeout });
      await this.page.waitForTimeout(TIMEOUTS.DEBOUNCE);
      await this.waitForData();
    });
  }

  /** Resizes a column by dragging its header handle; returns the new width. */
  async resizeColumn(columnName: string, deltaX: number): Promise<number> {
    return this.step(`resize "${columnName}" by ${deltaX}px`, async () => {
      const index = await this.getColumnIndex(columnName);
      const header = this.headerCells.nth(index);
      const box = await header.boundingBox();
      if (!box) throw new Error(`${this.label}: header "${columnName}" has no bounding box`);

      await this.page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(box.x + box.width - 2 + deltaX, box.y + box.height / 2, {
        steps: 8,
      });
      await this.page.mouse.up();

      const updated = await header.boundingBox();
      return updated?.width ?? 0;
    });
  }

  /** Reorders columns by dragging one header onto another. */
  async reorderColumn(fromColumn: string, toColumn: string): Promise<void> {
    await this.step(`move column "${fromColumn}" to "${toColumn}"`, async () => {
      const [fromIndex, toIndex] = await Promise.all([
        this.getColumnIndex(fromColumn),
        this.getColumnIndex(toColumn),
      ]);
      await this.headerCells.nth(fromIndex).dragTo(this.headerCells.nth(toIndex));
    });
  }

  /** Expands a master/detail or tree row. */
  async expandRow(
    rowIndex: number,
    expanderSelector = '[aria-expanded], .expander',
  ): Promise<void> {
    await this.step(`expand row ${rowIndex}`, async () => {
      const expander = this.rows.nth(rowIndex).locator(expanderSelector).first();
      if ((await expander.getAttribute('aria-expanded')) === 'true') return;
      await expander.click({ timeout: this.timeout });
    });
  }

  /** Double-click a cell to enter inline edit, type, and commit with Enter. */
  async editCell(rowIndex: number, columnName: string, value: string): Promise<void> {
    await this.step(`edit [${rowIndex}, ${columnName}] = "${value}"`, async () => {
      const cell = await this.getCell(rowIndex, columnName);
      await cell.dblclick({ timeout: this.timeout });
      const editor = cell.locator('input, textarea, [contenteditable="true"]').first();
      await editor.fill(value, { timeout: this.timeout });
      await editor.press('Enter');
    });
  }
}
