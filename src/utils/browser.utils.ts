import type { BrowserContext, Dialog, Download, Page } from '@playwright/test';
import path from 'node:path';
import { config } from '../config/env.config';
import { TIMEOUTS } from '../config/timeouts';
import { ensureDir } from './file.utils';
import { createLogger } from './logger';

const log = createLogger('Browser');

/* -------------------------------------------------------------------------- */
/* Tabs and windows                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Runs `trigger` and returns the tab/window it opens.
 * Use for `target="_blank"` links, OAuth popups and print previews.
 */
export async function openNewTab(
  context: BrowserContext,
  trigger: () => Promise<void>,
  timeout = TIMEOUTS.LONG,
): Promise<Page> {
  const [newPage] = await Promise.all([context.waitForEvent('page', { timeout }), trigger()]);
  await newPage.waitForLoadState('domcontentloaded');
  log.debug('New tab opened', { url: newPage.url() });
  return newPage;
}

export async function closeOtherTabs(context: BrowserContext, keep: Page): Promise<void> {
  await Promise.all(
    context
      .pages()
      .filter((page) => page !== keep)
      .map((page) => page.close()),
  );
}

export function getTabByTitle(context: BrowserContext, title: string): Page | undefined {
  return context.pages().find((page) => page.url().includes(title));
}

export async function switchToTab(context: BrowserContext, index: number): Promise<Page> {
  const page = context.pages()[index];
  if (!page) throw new Error(`No tab at index ${index}; ${context.pages().length} open.`);
  await page.bringToFront();
  return page;
}

/* -------------------------------------------------------------------------- */
/* Native dialogs                                                              */
/* -------------------------------------------------------------------------- */

export interface DialogResult {
  type: string;
  message: string;
  defaultValue: string;
}

/**
 * Handles the next native dialog (alert/confirm/prompt/beforeunload) and
 * returns what it said. Playwright auto-dismisses dialogs unless handled, so
 * register this *before* the action that opens one.
 */
export function handleNextDialog(
  page: Page,
  action: 'accept' | 'dismiss' = 'accept',
  promptText?: string,
): Promise<DialogResult> {
  return new Promise<DialogResult>((resolve, reject) => {
    page.once('dialog', (dialog: Dialog) => {
      const result: DialogResult = {
        type: dialog.type(),
        message: dialog.message(),
        defaultValue: dialog.defaultValue(),
      };
      const settle = action === 'accept' ? dialog.accept(promptText) : dialog.dismiss();
      settle.then(() => resolve(result)).catch(reject);
    });
  });
}

/** Installs a standing handler so dialogs never block a long-running suite. */
export function autoHandleDialogs(page: Page, action: 'accept' | 'dismiss' = 'accept'): void {
  page.on('dialog', (dialog) => {
    log.debug('Auto-handling dialog', { type: dialog.type(), message: dialog.message() });
    void (action === 'accept' ? dialog.accept() : dialog.dismiss());
  });
}

/* -------------------------------------------------------------------------- */
/* Downloads                                                                   */
/* -------------------------------------------------------------------------- */

export interface DownloadedFile {
  fileName: string;
  filePath: string;
  download: Download;
}

/** Runs `trigger`, waits for the download and saves it under test-results. */
export async function downloadFile(
  page: Page,
  trigger: () => Promise<void>,
  timeout = TIMEOUTS.EXTRA_LONG,
): Promise<DownloadedFile> {
  const [download] = await Promise.all([page.waitForEvent('download', { timeout }), trigger()]);
  const fileName = download.suggestedFilename();
  const filePath = path.join(ensureDir(config.paths.downloads), fileName);
  await download.saveAs(filePath);
  log.info('File downloaded', { fileName, filePath });
  return { fileName, filePath, download };
}

/* -------------------------------------------------------------------------- */
/* Clipboard, permissions, emulation                                           */
/* -------------------------------------------------------------------------- */

export async function grantClipboardAccess(
  context: BrowserContext,
  origin?: string,
): Promise<void> {
  await context.grantPermissions(
    ['clipboard-read', 'clipboard-write'],
    origin ? { origin } : undefined,
  );
}

export async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

export async function writeClipboard(page: Page, text: string): Promise<void> {
  await page.evaluate((value) => navigator.clipboard.writeText(value), text);
}

export async function setGeolocation(
  context: BrowserContext,
  latitude: number,
  longitude: number,
): Promise<void> {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude, longitude });
}

/** Freezes the page clock so time-dependent UI is deterministic. */
export async function freezeTime(page: Page, date: Date): Promise<void> {
  await page.clock.setFixedTime(date);
}

export async function emulateMedia(
  page: Page,
  options: {
    colorScheme?: 'light' | 'dark';
    reducedMotion?: 'reduce' | 'no-preference';
    media?: 'screen' | 'print';
  },
): Promise<void> {
  await page.emulateMedia(options);
}

/* -------------------------------------------------------------------------- */
/* Console and page errors                                                     */
/* -------------------------------------------------------------------------- */

export interface ConsoleCapture {
  errors: string[];
  warnings: string[];
  pageErrors: string[];
  failedRequests: string[];
}

/** An empty capture container, to be attached to a page later. */
export function createConsoleCapture(): ConsoleCapture {
  return { errors: [], warnings: [], pageErrors: [], failedRequests: [] };
}

/**
 * Starts recording console errors, uncaught exceptions and failed requests.
 * The returned object mutates as the test runs — assert on it at the end.
 *
 * Pass an existing `capture` to record into a container created earlier; this
 * is what lets a fixture own the container without depending on the page.
 */
export function captureConsole(page: Page, into?: ConsoleCapture): ConsoleCapture {
  const capture: ConsoleCapture = into ?? createConsoleCapture();

  page.on('console', (message) => {
    if (message.type() === 'error') capture.errors.push(message.text());
    if (message.type() === 'warning') capture.warnings.push(message.text());
  });
  page.on('pageerror', (error) => capture.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    capture.failedRequests.push(
      `${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`,
    );
  });

  return capture;
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

export async function setLocalStorage(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [key, value] as const);
}

export async function getLocalStorage(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), key);
}

export async function clearBrowserStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.context().clearCookies();
}

export async function setCookie(
  context: BrowserContext,
  cookie: { name: string; value: string; domain?: string; path?: string; url?: string },
): Promise<void> {
  await context.addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      ...(cookie.url
        ? { url: cookie.url }
        : { domain: cookie.domain ?? '', path: cookie.path ?? '/' }),
    },
  ]);
}
