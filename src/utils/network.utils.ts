import type { APIResponse, BrowserContext, Page, Request, Response, Route } from '@playwright/test';
import { TIMEOUTS } from '../config/timeouts';
import { createLogger } from './logger';
import type { CapturedRequest, MockResponse } from '../types';

const log = createLogger('Network');

type UrlMatcher = string | RegExp | ((url: URL) => boolean);

/**
 * Network control surface for a page or context: stub responses, simulate
 * failures and latency, and record traffic for assertions.
 */
export class NetworkHelper {
  private readonly captured: CapturedRequest[] = [];
  private capturing = false;

  constructor(private readonly target: Page | BrowserContext) {}

  /** Replaces matching requests with a canned response. */
  async mock<T>(pattern: UrlMatcher, response: MockResponse<T>): Promise<void> {
    await this.target.route(pattern, async (route: Route) => {
      if (response.delayMs) await new Promise((r) => setTimeout(r, response.delayMs));
      const body =
        typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
      await route.fulfill({
        status: response.status ?? 200,
        contentType: response.contentType ?? 'application/json',
        headers: response.headers ?? {},
        body: response.body === undefined ? undefined : body,
      });
    });
    log.debug('Route mocked', { pattern: String(pattern), status: response.status ?? 200 });
  }

  /** Lets the request hit the server, then rewrites the response body. */
  async modifyResponse<T>(
    pattern: UrlMatcher,
    transform: (body: T, response: APIResponse) => T | Promise<T>,
  ): Promise<void> {
    await this.target.route(pattern, async (route: Route) => {
      const response = await route.fetch();
      const original = (await response.json()) as T;
      const modified = await transform(original, response);
      await route.fulfill({ response, body: JSON.stringify(modified) });
    });
  }

  /** Aborts matching requests — offline behaviour, dead CDN, blocked analytics. */
  async abort(
    pattern: UrlMatcher,
    errorCode: Parameters<Route['abort']>[0] = 'failed',
  ): Promise<void> {
    await this.target.route(pattern, (route) => route.abort(errorCode));
  }

  /** Adds latency without changing the payload — for spinner/skeleton coverage. */
  async delay(pattern: UrlMatcher, ms: number): Promise<void> {
    await this.target.route(pattern, async (route) => {
      await new Promise((r) => setTimeout(r, ms));
      await route.continue();
    });
  }

  /** Blocks images/fonts/media to speed up non-visual runs. */
  async blockHeavyAssets(): Promise<void> {
    await this.target.route('**/*', (route) => {
      const type = route.request().resourceType();
      return ['image', 'font', 'media'].includes(type) ? route.abort() : route.continue();
    });
  }

  /** Blocks common third-party trackers that add noise and flakiness. */
  async blockThirdParty(hosts: string[] = DEFAULT_BLOCKED_HOSTS): Promise<void> {
    await this.target.route('**/*', (route) => {
      const url = route.request().url();
      return hosts.some((host) => url.includes(host)) ? route.abort() : route.continue();
    });
  }

  /** Starts recording every request for later assertion. */
  startCapture(filter?: UrlMatcher): void {
    if (this.capturing) return;
    this.capturing = true;
    this.target.on('request', (request: Request) => {
      if (filter && !matches(request.url(), filter)) return;
      this.captured.push({
        url: request.url(),
        method: request.method(),
        postData: request.postData(),
        headers: request.headers(),
        timestamp: Date.now(),
      });
    });
  }

  get requests(): readonly CapturedRequest[] {
    return this.captured;
  }

  findRequests(pattern: UrlMatcher): CapturedRequest[] {
    return this.captured.filter((request) => matches(request.url, pattern));
  }

  clearCapture(): void {
    this.captured.length = 0;
  }

  /** Removes every route handler installed on the target. */
  async reset(): Promise<void> {
    await this.target.unrouteAll({ behavior: 'ignoreErrors' });
  }

  /** Waits for the response of a specific call — e.g. the save that a click triggers. */
  async waitForResponse(
    pattern: UrlMatcher,
    options: { timeout?: number; status?: number } = {},
  ): Promise<Response> {
    const page = this.target as Page;
    return page.waitForResponse(
      (response) =>
        matches(response.url(), pattern) &&
        (options.status === undefined || response.status() === options.status),
      { timeout: options.timeout ?? TIMEOUTS.LONG },
    );
  }

  /** Simulates going offline (context-level only). */
  async setOffline(offline: boolean): Promise<void> {
    if ('setOffline' in this.target) {
      await this.target.setOffline(offline);
    } else {
      await this.target.context().setOffline(offline);
    }
  }
}

const DEFAULT_BLOCKED_HOSTS = [
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'facebook.net',
  'hotjar.com',
  'segment.io',
  'sentry.io',
  'fullstory.com',
  'optimizely.com',
];

function matches(url: string, pattern: UrlMatcher): boolean {
  if (typeof pattern === 'string') return url.includes(pattern.replace(/\*/g, ''));
  if (pattern instanceof RegExp) return pattern.test(url);
  return pattern(new URL(url));
}
