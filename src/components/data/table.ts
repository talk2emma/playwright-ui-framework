import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import type { ComponentOptions, SelectorLike, SortDirection, TableRow } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface TableOptions extends ComponentOptions {
  headerSelector?: string;
  rowSelector?: string;
  cellSelector?: string;
  headerCellSelector?: string;
}

/**
 * HTML table.
 *
 * Everything is addressable by column *name* rather than index, so tests keep
 * working when a column is inserted — the single most common cause of
 * large-scale table-test breakage.
 */
export class Table extends BaseComponent {
  private readonly headerSelector: string;
  private readonly rowSelector: string;
  private readonly cellSelector: string;
  private readonly headerCellSelector: string;

  protected override get componentType(): string {
    return 'Table';
  }

  constructor(scope: Scope, selector: SelectorLike, options: TableOptions = {}) {
    super(scope, selector, options);
    this.headerSelector = options.headerSelector ?? 'thead';
    this.rowSelector = options.rowSelector ?? 'tbody tr';
    this.cellSelector = options.cellSelector ?? 'td';
    this.headerCellSelector = options.headerCellSelector ?? 'th';
  }

  get rows(): Locator {
    return this.locator.locator(this.rowSelector);
  }

  get headerCells(): Locator {
    return this.locator.locator(this.headerSelector).locator(this.headerCellSelector);
  }

  /* ------------------------------- shape -------------------------------- */

  async getHeaders(): Promise<string[]> {
    return (await this.headerCells.allInnerTexts()).map(normalizeText);
  }

  async rowCount(): Promise<number> {
    return this.rows.count();
  }

  async columnCount(): Promise<number> {
    return this.headerCells.count();
  }

  async isEmpty(): Promise<boolean> {
    return (await this.rowCount()) === 0;
  }

  /** Index of a column by header text. Throws with the available headers listed. */
  async getColumnIndex(columnName: string): Promise<number> {
    const headers = await this.getHeaders();
    const index = headers.findIndex((header) => header.toLowerCase() === columnName.toLowerCase());
    if (index === -1) {
      throw new Error(
        `${this.label}: column "${columnName}" not found. Available: ${headers.join(', ')}`,
      );
    }
    return index;
  }

  /* -------------------------------- read -------------------------------- */

  /** The whole table as objects keyed by header text. */
  async getAllRows(): Promise<TableRow[]> {
    const headers = await this.getHeaders();
    const rows = await this.rows.all();
    const result: TableRow[] = [];

    for (const row of rows) {
      const cells = (await row.locator(this.cellSelector).allInnerTexts()).map(normalizeText);
      const record: TableRow = {};
      cells.forEach((cell, index) => {
        record[headers[index] ?? `column${index}`] = cell;
      });
      result.push(record);
    }
    return result;
  }

  async getRow(rowIndex: number): Promise<TableRow> {
    const headers = await this.getHeaders();
    const cells = (await this.rows.nth(rowIndex).locator(this.cellSelector).allInnerTexts()).map(
      normalizeText,
    );
    const record: TableRow = {};
    cells.forEach((cell, index) => {
      record[headers[index] ?? `column${index}`] = cell;
    });
    return record;
  }

  async getCellText(rowIndex: number, column: number | string): Promise<string> {
    const cell = await this.getCell(rowIndex, column);
    return normalizeText(await cell.innerText());
  }

  /** Cell by row index and column — the column may be an index or a header name. */
  async getCell(rowIndex: number, column: number | string): Promise<Locator> {
    const columnIndex = typeof column === 'number' ? column : await this.getColumnIndex(column);
    return this.rows.nth(rowIndex).locator(this.cellSelector).nth(columnIndex);
  }

  async getColumnValues(columnName: string): Promise<string[]> {
    const index = await this.getColumnIndex(columnName);
    return (
      await this.rows.locator(`${this.cellSelector}:nth-child(${index + 1})`).allInnerTexts()
    ).map(normalizeText);
  }

  /* ------------------------------- search -------------------------------- */

  /** Rows whose named column matches `value`. */
  async findRowsByColumnValue(columnName: string, value: string | RegExp): Promise<Locator> {
    const index = await this.getColumnIndex(columnName);
    return this.rows.filter({
      has: this.page.locator(`${this.cellSelector}:nth-child(${index + 1})`, { hasText: value }),
    });
  }

  /** Rows containing the given text in any cell. */
  findRowsContaining(value: string | RegExp): Locator {
    return this.rows.filter({ hasText: value });
  }

  /** Row index matching a full or partial record; -1 when nothing matches. */
  async findRowIndex(criteria: Partial<TableRow>): Promise<number> {
    const rows = await this.getAllRows();
    return rows.findIndex((row) =>
      Object.entries(criteria).every(([key, value]) => row[key] === value),
    );
  }

  async containsRow(criteria: Partial<TableRow>): Promise<boolean> {
    return (await this.findRowIndex(criteria)) !== -1;
  }

  /** Clicks a control (button/link) inside the row matching the criteria. */
  async clickRowAction(criteria: Partial<TableRow>, actionSelector: string): Promise<void> {
    await this.step(`click row action ${actionSelector}`, async () => {
      const index = await this.findRowIndex(criteria);
      if (index === -1) {
        throw new Error(`${this.label}: no row matching ${JSON.stringify(criteria)}`);
      }
      await this.rows.nth(index).locator(actionSelector).first().click({ timeout: this.timeout });
    });
  }

  /* ------------------------------- sorting ------------------------------- */

  async sortBy(columnName: string, direction: SortDirection = 'asc'): Promise<void> {
    await this.step(`sort by "${columnName}" ${direction}`, async () => {
      const index = await this.getColumnIndex(columnName);
      const header = this.headerCells.nth(index);
      for (let attempt = 0; attempt < 3; attempt++) {
        if ((await this.getSortDirection(columnName)) === direction) return;
        await header.click({ timeout: this.timeout });
        await this.page.waitForTimeout(200);
      }
    });
  }

  async getSortDirection(columnName: string): Promise<SortDirection> {
    const index = await this.getColumnIndex(columnName);
    const header = this.headerCells.nth(index);
    const ariaSort = await header.getAttribute('aria-sort');
    if (ariaSort === 'ascending') return 'asc';
    if (ariaSort === 'descending') return 'desc';
    const className = (await header.getAttribute('class')) ?? '';
    if (/(^|\s|-)asc/i.test(className)) return 'asc';
    if (/(^|\s|-)desc/i.test(className)) return 'desc';
    return 'none';
  }

  /** Verifies the column is genuinely ordered — string or numeric aware. */
  async isColumnSorted(columnName: string, direction: SortDirection = 'asc'): Promise<boolean> {
    const values = await this.getColumnValues(columnName);
    const numeric = values.every(
      (value) => value !== '' && !Number.isNaN(Number(value.replace(/[^0-9.-]/g, ''))),
    );
    const sorted = [...values].sort((a, b) =>
      numeric
        ? Number(a.replace(/[^0-9.-]/g, '')) - Number(b.replace(/[^0-9.-]/g, ''))
        : a.localeCompare(b),
    );
    if (direction === 'desc') sorted.reverse();
    return JSON.stringify(values) === JSON.stringify(sorted);
  }

  /* ------------------------------ selection ------------------------------ */

  async selectRow(rowIndex: number, checkboxSelector = 'input[type="checkbox"]'): Promise<void> {
    await this.step(`select row ${rowIndex}`, async () => {
      await this.rows
        .nth(rowIndex)
        .locator(checkboxSelector)
        .first()
        .check({ timeout: this.timeout });
    });
  }

  async selectAllRows(headerCheckboxSelector = 'thead input[type="checkbox"]'): Promise<void> {
    await this.step('select all rows', async () => {
      await this.locator.locator(headerCheckboxSelector).first().check({ timeout: this.timeout });
    });
  }

  async getSelectedRowCount(checkboxSelector = 'input[type="checkbox"]:checked'): Promise<number> {
    return this.rows.locator(checkboxSelector).count();
  }
}
