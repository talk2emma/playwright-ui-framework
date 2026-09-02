import path from 'node:path';
import { test as setup, expect } from '@playwright/test';
import { config } from '../config/env.config';
import { ensureDir } from '../utils/file.utils';
import { logger } from '../utils/logger';
import { LoginPage } from '../pages/bank/login.page';
import { PERSONAS, type PersonaName } from '../data/personas';

/**
 * Signs in once per persona and saves the session to `storage/<name>.json`.
 *
 * Wired as the `setup` project in `playwright.config.ts`, and every browser
 * project declares `dependencies: ['setup']` — so nothing runs against an
 * unauthenticated target and no spec has to log in for itself.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE ONE FILE THAT KNOWS THE APPLICATION'S LOGIN
 * ---------------------------------------------------------------------------
 * Everything else in the framework is application-agnostic. When SecureBank's
 * sign-in changes, exactly one file changes — and it delegates to `LoginPage`
 * rather than re-deriving selectors, so even here the markup is described in
 * only one place.
 *
 * ---------------------------------------------------------------------------
 * WHY THE SAVED SESSIONS ARE NOT ACTUALLY LOAD-BEARING HERE
 * ---------------------------------------------------------------------------
 * SecureBank keeps its state in `localStorage`, and `storageState` captures
 * that — so a replayed session really does skip the login. But the suite's
 * specs mostly sign in through the `signedIn` fixture instead, because signing
 * in *is* fast here and doing it per test keeps every test starting from the
 * seeded dataset.
 *
 * The setup project is kept because it is the pattern a real application needs
 * (where login is slow and rate-limited), and because it doubles as a
 * start-up smoke check: if sign-in is broken, this fails first and clearly,
 * instead of every spec failing with a confusing selector timeout.
 */

/** Personas worth capturing a session for. */
const CAPTURED: PersonaName[] = ['standard', 'admin'];

for (const name of CAPTURED) {
  setup(`authenticate as ${name}`, async ({ page }) => {
    const persona = PERSONAS[name];
    const statePath = path.join(config.paths.storage, `${name}.json`);
    ensureDir(config.paths.storage);

    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(persona);

    /*
     * Prove the session is real before saving it.
     *
     * An unverified storage state turns one login failure into a whole-suite
     * failure with no obvious cause: every test loads a session that is not
     * signed in, and each one fails on a different missing element.
     */
    await page.waitForURL(/\/bank\/dashboard/, { timeout: config.timeouts.navigation });
    await expect(
      page.getByTestId('bank-dashboard-page'),
      `Signed in as ${persona.username} but the dashboard never rendered.`,
    ).toBeVisible();

    await page.context().storageState({ path: statePath });
    logger.info('Saved authenticated session', { persona: persona.username, statePath });
  });
}
