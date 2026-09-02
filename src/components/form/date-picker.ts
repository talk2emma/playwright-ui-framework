import type { Locator } from '@playwright/test';
import { BaseComponent } from '../../core/base.component';
import { format, toIsoDate } from '../../utils/date.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface DatePickerOptions extends ComponentOptions {
  calendarSelector?: string;
  daySelector?: string;
  monthLabelSelector?: string;
  nextMonthSelector?: string;
  previousMonthSelector?: string;
  /** Format the input expects when typing directly, e.g. 'MM/DD/YYYY'. */
  inputFormat?: string;
}

/**
 * Date picker, covering both interaction paths: typing into the input, and
 * navigating the calendar popup month by month.
 */
export class DatePicker extends BaseComponent {
  private readonly calendarSelector: string;
  private readonly daySelector: string;
  private readonly monthLabelSelector: string;
  private readonly nextMonthSelector: string;
  private readonly previousMonthSelector: string;
  private readonly inputFormat: string;

  protected override get componentType(): string {
    return 'DatePicker';
  }

  constructor(scope: Scope, selector: SelectorLike, options: DatePickerOptions = {}) {
    super(scope, selector, options);
    this.calendarSelector = options.calendarSelector ?? '[role="dialog"], .calendar, .datepicker';
    this.daySelector = options.daySelector ?? '[role="gridcell"], .day:not(.disabled)';
    this.monthLabelSelector = options.monthLabelSelector ?? '.month-label, [aria-live="polite"]';
    this.nextMonthSelector = options.nextMonthSelector ?? '[aria-label*="next" i]';
    this.previousMonthSelector = options.previousMonthSelector ?? '[aria-label*="previous" i]';
    this.inputFormat = options.inputFormat ?? 'YYYY-MM-DD';
  }

  get calendar(): Locator {
    return this.page.locator(this.calendarSelector).first();
  }

  async open(): Promise<void> {
    await this.step('open calendar', async () => {
      if (await this.calendar.isVisible().catch(() => false)) return;
      await this.locator.click({ timeout: this.timeout });
      await this.calendar.waitFor({ state: 'visible', timeout: this.timeout });
    });
  }

  async close(): Promise<void> {
    await this.step('close calendar', async () => {
      await this.page.keyboard.press('Escape');
      await this.calendar
        .waitFor({ state: 'hidden', timeout: this.timeout })
        .catch(() => undefined);
    });
  }

  /** Fastest and least brittle path: type the value straight into the field. */
  async typeDate(date: Date): Promise<void> {
    const value = format(date, this.inputFormat);
    await this.step(`type date "${value}"`, async () => {
      await this.prepare();
      await this.locator.fill(value, { timeout: this.timeout });
      await this.locator.press('Enter');
    });
  }

  /** Opens the calendar and clicks the day, paging months as needed. */
  async pickDate(date: Date): Promise<void> {
    await this.step(`pick date ${toIsoDate(date)}`, async () => {
      await this.open();
      await this.navigateToMonth(date);
      const day = String(date.getDate());
      const cell = this.calendar
        .locator(this.daySelector)
        .filter({ hasText: new RegExp(`^\\s*${day}\\s*$`) })
        .first();
      await cell.click({ timeout: this.timeout });
    });
  }

  /** Pages the calendar until the target month is shown (bounded to 24 hops). */
  async navigateToMonth(target: Date): Promise<void> {
    const wanted = format(target, 'MMMM YYYY');
    for (let attempt = 0; attempt < 24; attempt++) {
      const current = await this.getDisplayedMonth();
      if (current.toLowerCase().includes(wanted.toLowerCase())) return;
      const currentDate = new Date(`${current} 1`);
      const forward = Number.isNaN(currentDate.getTime()) || currentDate < target;
      const button = this.calendar
        .locator(forward ? this.nextMonthSelector : this.previousMonthSelector)
        .first();
      await button.click({ timeout: this.timeout });
      await this.page.waitForTimeout(100);
    }
    throw new Error(`${this.label}: could not navigate to ${wanted}`);
  }

  async getDisplayedMonth(): Promise<string> {
    const label = this.calendar.locator(this.monthLabelSelector).first();
    return (await label.count()) > 0 ? (await label.innerText()).trim() : '';
  }

  async getSelectedDate(): Promise<string> {
    return this.locator.inputValue().catch(async () => (await this.getText()) || '');
  }

  async clear(): Promise<void> {
    await this.step('clear date', async () => {
      await this.locator.fill('', { timeout: this.timeout });
    });
  }

  /** Days the picker refuses — min/max range and blackout dates. */
  async getDisabledDays(): Promise<string[]> {
    await this.open();
    return this.calendar
      .locator('[aria-disabled="true"], .day.disabled, [disabled]')
      .allInnerTexts()
      .then((texts) => texts.map((text) => text.trim()));
  }

  async isDateDisabled(date: Date): Promise<boolean> {
    await this.open();
    await this.navigateToMonth(date);
    const cell = this.calendar
      .locator(this.daySelector)
      .filter({ hasText: new RegExp(`^\\s*${date.getDate()}\\s*$`) })
      .first();
    const [ariaDisabled, className] = await Promise.all([
      cell.getAttribute('aria-disabled'),
      cell.getAttribute('class'),
    ]);
    return ariaDisabled === 'true' || /disabled/.test(className ?? '');
  }

  /** Selects a start/end pair in a range picker. */
  async pickRange(start: Date, end: Date): Promise<void> {
    await this.step(`pick range ${toIsoDate(start)} → ${toIsoDate(end)}`, async () => {
      await this.pickDate(start);
      await this.pickDate(end);
    });
  }
}
