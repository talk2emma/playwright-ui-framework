import { test as base, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { config, getUser } from '../config/env.config';
import { ApiClient } from '../api/api.client';
import { ui, type UiFactory } from '../components/component.factory';
import { createLogger, type Logger } from '../utils/logger';
import { NetworkHelper } from '../utils/network.utils';
import { captureConsole, createConsoleCapture, type ConsoleCapture } from '../utils/browser.utils';
import { generateUser, seedFaker, type GeneratedUser } from '../utils/data.utils';
import type { AppConfig } from '../config/env.config';
import type { TestUser, UserRole } from '../types';

export interface WorkerFixtures {
  /** One API client per worker — reused across the worker's tests. */
  api: ApiClient;
}

export interface TestFixtures {
  /** Validated runtime configuration. */
  appConfig: AppConfig;
  /** Logger scoped to the running test. */
  log: Logger;
  /** Component factory bound to the page. */
  ui: UiFactory;
  /** Network stubbing / capture for the page. */
  network: NetworkHelper;
  /** Console errors, page errors and failed requests recorded during the test. */
  consoleErrors: ConsoleCapture;
  /** Deterministic, per-test generated user data. */
  testData: GeneratedUser;
  /** Credentials for a role, from the environment. */
  userFor: (role: UserRole) => TestUser;
  /** Fails the test if the page logged console errors. Opt in per test. */
  failOnConsoleErrors: boolean;
}

/**
 * The framework's test object.
 *
 * Tests import `test` and `expect` from `@fixtures/index` — never from
 * `@playwright/test` directly — so every test automatically gets logging,
 * console-error capture, network control and the component factory.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  api: [
    async ({}, use) => {
      const client = new ApiClient();
      await use(client);
      await client.dispose();
    },
    { scope: 'worker' },
  ],

  appConfig: async ({}, use) => {
    await use(config);
  },

  log: async ({}, use, testInfo) => {
    const logger = createLogger(testInfo.title);
    logger.info('Test started', { file: testInfo.file, project: testInfo.project.name });
    await use(logger);
    logger.info('Test finished', { status: testInfo.status, duration: testInfo.duration });
  },

  ui: async ({ page }, use) => {
    await use(ui(page));
  },

  network: async ({ page }, use) => {
    const helper = new NetworkHelper(page);
    await use(helper);
    await helper.reset();
  },

  // Deliberately does NOT depend on `page`: the overridden `page` fixture
  // below attaches the listeners, and a mutual dependency would be a cycle.
  consoleErrors: async ({}, use) => {
    await use(createConsoleCapture());
  },

  testData: async ({}, use, testInfo) => {
    // Seeding from the title makes generated data stable across retries,
    // so a retry reproduces the same inputs as the original attempt.
    seedFaker(hash(testInfo.titlePath.join('|')));
    await use(generateUser());
  },

  userFor: async ({}, use) => {
    await use(getUser);
  },

  failOnConsoleErrors: [false, { option: true }],

  /**
   * Wraps the built-in page fixture to attach diagnostics on failure and to
   * enforce the console-error policy when a test opts in.
   */
  page: async ({ page, consoleErrors, failOnConsoleErrors }, use, testInfo) => {
    captureConsole(page, consoleErrors);

    await use(page);

    if (testInfo.status !== testInfo.expectedStatus) {
      await attachDiagnostics(page, testInfo, consoleErrors);
    }

    if (failOnConsoleErrors && consoleErrors.errors.length > 0) {
      throw new Error(
        `Console errors detected:\n${consoleErrors.errors.map((e) => `  - ${e}`).join('\n')}`,
      );
    }
  },
});

async function attachDiagnostics(
  page: Page,
  testInfo: TestInfo,
  consoleErrors: ConsoleCapture,
): Promise<void> {
  if (page.isClosed()) return;

  await testInfo
    .attach('failure-url.txt', { body: page.url(), contentType: 'text/plain' })
    .catch(() => undefined);

  if (
    consoleErrors.errors.length +
      consoleErrors.pageErrors.length +
      consoleErrors.failedRequests.length >
    0
  ) {
    await testInfo
      .attach('browser-diagnostics.json', {
        body: JSON.stringify(consoleErrors, null, 2),
        contentType: 'application/json',
      })
      .catch(() => undefined);
  }

  await testInfo
    .attach('dom-snapshot.html', { body: await page.content(), contentType: 'text/html' })
    .catch(() => undefined);
}

/** Stable 32-bit hash — used to seed faker deterministically per test. */
function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index++) {
    result = (result << 5) - result + value.charCodeAt(index);
    result |= 0;
  }
  return Math.abs(result);
}

export type { BrowserContext, Page };
