import type { Page } from '@playwright/test';

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
