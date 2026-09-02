import { expect, test, type Locator, type Page, type Response } from '@playwright/test';
import { config } from '../config/env.config';
import { TIMEOUTS } from '../config/timeouts';
import { createLogger, type Logger } from '../utils/logger';
import { NetworkHelper } from '../utils/network.utils';
import { scanAccessibility } from '../utils/a11y.utils';
import type { A11yScanOptions, SelectorLike } from '../types';
import type { Scope } from './locator.factory';

/**
 * Base for every page object.
 *
 * A page object owns: the URL it lives at, the components it exposes, and the
 * high-level business actions a test would name out loud. It must NOT contain
 * assertions about business outcomes (those belong in tests) beyond the
 * self-verification of `waitUntilLoaded`.
 */
export abstract class BasePage {
  protected readonly log: Logger;
  readonly network: NetworkHelper;

  /** Path appended to the configured baseURL, e.g. `/checkout`. */
  protected abstract readonly path: string;

  /**
   * An element whose presence proves the page finished rendering.
   * Every page must declare one — this is what makes navigation deterministic.
   */
  protected abstract readonly readyIndicator: SelectorLike;

  constructor(readonly page: Page) {
    this.log = createLogger(this.constructor.name);
    this.network = new NetworkHelper(page);
  }

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                              */
  /* ---------------------------------------------------------------------- */

  get url(): string {
    return new URL(this.path, config.baseURL).toString();
  }

  /** Navigates to this page and waits until it is genuinely usable. */
  async goto(
    options: { query?: Record<string, string>; waitUntilLoaded?: boolean } = {},
  ): Promise<void> {
    const target = new URL(this.path, config.baseURL);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      target.searchParams.set(key, value);
    }
    await test.step(`Navigate to ${this.constructor.name} (${target.pathname})`, async () => {
      await this.page.goto(target.toString(), {
        waitUntil: 'domcontentloaded',
        timeout: config.timeouts.navigation,
      });
      if (options.waitUntilLoaded !== false) await this.waitUntilLoaded();
    });
  }

  /** Blocks until the ready indicator is visible. Override to add more checks. */
  async waitUntilLoaded(timeout = config.timeouts.navigation): Promise<void> {
    const indicator = this.resolve(this.readyIndicator);
    await indicator.waitFor({ state: 'visible', timeout });
    this.log.debug('Page loaded', { url: this.page.url() });
  }

  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitUntilLoaded();
  }

  async goBack(): Promise<void> {
    await this.page.goBack({ waitUntil: 'domcontentloaded' });
  }

  async goForward(): Promise<void> {
    await this.page.goForward({ waitUntil: 'domcontentloaded' });
  }

  /** True when the browser is on this page — for conditional flows. */
  async isCurrentPage(): Promise<boolean> {
    try {
      await this.resolve(this.readyIndicator).waitFor({
        state: 'visible',
        timeout: TIMEOUTS.SHORT,
      });
      return true;
    } catch {
      return false;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Page-level state                                                        */
  /* ---------------------------------------------------------------------- */

  async title(): Promise<string> {
    return this.page.title();
  }

  currentUrl(): string {
    return this.page.url();
  }

  /** Waits for the SPA to go quiet: no in-flight requests and no spinners. */
  async waitForIdle(options: { spinnerSelector?: string; timeout?: number } = {}): Promise<void> {
    const timeout = options.timeout ?? config.timeouts.navigation;
    await this.page.waitForLoadState('networkidle', { timeout }).catch(() => {
      this.log.debug('networkidle not reached; continuing');
    });
    if (options.spinnerSelector) {
      await this.page
        .locator(options.spinnerSelector)
        .waitFor({ state: 'hidden', timeout })
        .catch(() => undefined);
    }
  }

  async waitForUrl(pattern: string | RegExp, timeout = config.timeouts.navigation): Promise<void> {
    await this.page.waitForURL(pattern, { timeout });
  }

  /** Runs an action and returns the API response it triggered. */
  async actionWithResponse(
    action: () => Promise<void>,
    urlPattern: string | RegExp,
    timeout = config.timeouts.navigation,
  ): Promise<Response> {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) =>
          typeof urlPattern === 'string' ? r.url().includes(urlPattern) : urlPattern.test(r.url()),
        { timeout },
      ),
      action(),
    ]);
    return response;
  }

  /* ---------------------------------------------------------------------- */
  /* Assertions                                                              */
  /* ---------------------------------------------------------------------- */

  async expectLoaded(): Promise<void> {
    await expect(
      this.resolve(this.readyIndicator),
      `${this.constructor.name} should be loaded`,
    ).toBeVisible({ timeout: config.timeouts.navigation });
  }

  async expectUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern, { timeout: config.timeouts.navigation });
  }

  async expectTitle(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(pattern, { timeout: config.timeouts.navigation });
  }

  /** Scans this page for WCAG violations. */
  async checkAccessibility(options: A11yScanOptions = {}): Promise<void> {
    await scanAccessibility(this.page, options);
  }

  /* ---------------------------------------------------------------------- */
  /* Helpers for subclasses                                                  */
  /* ---------------------------------------------------------------------- */

  protected resolve(selector: SelectorLike): Locator {
    if (typeof selector === 'string') return this.page.locator(selector);
    if (typeof selector === 'function') return selector(this.page);
    return selector;
  }

  protected scope(): Scope {
    return this.page;
  }

  /** Takes a full-page screenshot and attaches it to the report. */
  async captureScreenshot(name = `${this.constructor.name}.png`): Promise<void> {
    const buffer = await this.page.screenshot({ fullPage: true });
    await test.info().attach(name, { body: buffer, contentType: 'image/png' });
  }
}
