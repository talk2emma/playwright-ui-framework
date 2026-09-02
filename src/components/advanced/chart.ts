import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import { TIMEOUTS } from '../../config/timeouts';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface ChartOptions extends ComponentOptions {
  seriesSelector?: string;
  dataPointSelector?: string;
  legendSelector?: string;
  tooltipSelector?: string;
  axisLabelSelector?: string;
}

/**
 * SVG chart (D3, Highcharts, Chart.js in SVG mode, Recharts).
 *
 * Charts have no text to assert on, so the useful checks are: the right number
 * of marks, the legend, the axis labels, and the tooltip a hover reveals.
 */
export class Chart extends BaseComponent {
  private readonly seriesSelector: string;
  private readonly dataPointSelector: string;
  private readonly legendSelector: string;
  private readonly tooltipSelector: string;
  private readonly axisLabelSelector: string;

  protected override get componentType(): string {
    return 'Chart';
  }

  constructor(scope: Scope, selector: SelectorLike, options: ChartOptions = {}) {
    super(scope, selector, options);
    this.seriesSelector = options.seriesSelector ?? '.series, g[class*="series"]';
    this.dataPointSelector =
      options.dataPointSelector ?? 'rect.bar, circle.point, path.line, .data-point';
    this.legendSelector = options.legendSelector ?? '.legend, [class*="legend"]';
    this.tooltipSelector = options.tooltipSelector ?? '.tooltip, [class*="tooltip"]';
    this.axisLabelSelector = options.axisLabelSelector ?? '.axis text, [class*="axis"] text';
  }

  get dataPoints(): Locator {
    return this.locator.locator(this.dataPointSelector);
  }

  async dataPointCount(): Promise<number> {
    return this.dataPoints.count();
  }

  async seriesCount(): Promise<number> {
    return this.locator.locator(this.seriesSelector).count();
  }

  /** Hovers a mark and returns the tooltip text it reveals. */
  async hoverDataPoint(index: number): Promise<string> {
    return this.step(`hover data point ${index}`, async () => {
      await this.dataPoints.nth(index).hover({ timeout: this.timeout, force: true });
      const tooltip = this.page.locator(this.tooltipSelector).first();
      await tooltip.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });
      return normalizeText(await tooltip.innerText());
    });
  }

  async clickDataPoint(index: number): Promise<void> {
    await this.step(`click data point ${index}`, async () => {
      await this.dataPoints.nth(index).click({ timeout: this.timeout, force: true });
    });
  }

  async getLegendItems(): Promise<string[]> {
    const legend = this.locator.locator(this.legendSelector).first();
    if ((await legend.count()) === 0) return [];
    const texts = await legend.locator('text, li, span').allInnerTexts();
    return texts.map(normalizeText).filter(Boolean);
  }

  /** Clicking a legend entry usually toggles that series' visibility. */
  async toggleSeries(name: string): Promise<void> {
    await this.step(`toggle series "${name}"`, async () => {
      await this.locator
        .locator(this.legendSelector)
        .getByText(name, { exact: false })
        .first()
        .click({ timeout: this.timeout });
    });
  }

  async getAxisLabels(): Promise<string[]> {
    return (await this.locator.locator(this.axisLabelSelector).allInnerTexts())
      .map(normalizeText)
      .filter(Boolean);
  }

  /** Values encoded in data attributes, when the library provides them. */
  async getDataValues(attribute = 'data-value'): Promise<string[]> {
    return this.dataPoints.evaluateAll(
      (elements, attr) => elements.map((element) => element.getAttribute(attr) ?? ''),
      attribute,
    );
  }

  /** Bar heights as a proxy for relative values — for ordering assertions. */
  async getBarHeights(): Promise<number[]> {
    return this.dataPoints.evaluateAll((elements) =>
      elements.map((element) => Number(element.getAttribute('height') ?? 0)),
    );
  }

  async waitForRender(timeout = TIMEOUTS.LONG): Promise<void> {
    await this.step('wait for chart to render', async () => {
      await this.locator.waitFor({ state: 'visible', timeout });
      await this.page
        .waitForFunction(
          ([selector, pointSelector]) =>
            (document.querySelector(selector!)?.querySelectorAll(pointSelector!).length ?? 0) > 0,
          [await this.rootSelector(), this.dataPointSelector],
          { timeout },
        )
        .catch(() => undefined);
    });
  }

  /** Charts should expose a title/description for non-sighted users. */
  async getAccessibleDescription(): Promise<string> {
    return this.locator.evaluate((element) => {
      const title = element.querySelector('title')?.textContent;
      const description = element.querySelector('desc')?.textContent;
      return [title, description, element.getAttribute('aria-label')]
        .filter(Boolean)
        .join(' ')
        .trim();
    });
  }

  private async rootSelector(): Promise<string> {
    const id = await this.getAttribute('id');
    return id ? `#${id}` : 'svg';
  }
}
