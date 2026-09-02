import path from 'node:path';
import fs from 'node:fs';
import { test as baseTest } from './base.fixture';
import { config, getUser } from '../config/env.config';
import type { BrowserContext, Page } from '@playwright/test';
import type { UserRole } from '../types';

export interface AuthFixtures {
  /** A context already signed in as the standard user. */
  authenticatedContext: BrowserContext;
  /** A page already signed in as the standard user. */
  authenticatedPage: Page;
  /** Signs in as any role on demand and returns that role's page. */
  pageAs: (role: UserRole) => Promise<Page>;
}

/**
 * Authentication via saved storage state.
 *
 * Logging in through the UI once per role (in `auth.setup.ts`) and replaying
 * the cookies afterwards removes a login from every single test — usually the
 * largest single saving available in a UI suite.
 */
export const test = baseTest.extend<AuthFixtures>({
  authenticatedContext: async ({ browser }, use) => {
    const storageState = storageStateFor('standard');
    const context = await browser.newContext({
      storageState,
      viewport: config.viewport,
      ignoreHTTPSErrors: config.ignoreHTTPSErrors,
    });
    await use(context);
    await context.close();
  },

  authenticatedPage: async ({ authenticatedContext }, use) => {
    const page = await authenticatedContext.newPage();
    await use(page);
    await page.close();
  },

  pageAs: async ({ browser }, use) => {
    const opened: Page[] = [];

    await use(async (role: UserRole) => {
      const context = await browser.newContext({
        storageState: storageStateFor(role),
        viewport: config.viewport,
        ignoreHTTPSErrors: config.ignoreHTTPSErrors,
      });
      const page = await context.newPage();
      opened.push(page);
      return page;
    });

    for (const page of opened) {
      await page.context().close();
    }
  },
});

/**
 * Path to a role's saved session, or undefined when it has not been created.
 * Undefined means "start signed out" rather than a hard failure, so a suite
 * that does not use auth still runs.
 */
export function storageStateFor(role: UserRole): string | undefined {
  const target = getUser(role).storageStatePath ?? path.join(config.paths.storage, `${role}.json`);
  return fs.existsSync(target) ? target : undefined;
}

export { expect } from './custom-matchers';
