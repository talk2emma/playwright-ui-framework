/**
 * ===========================================================================
 * Authentication — SecureBank
 * ===========================================================================
 *
 * Target: https://qaplayground.com/bank/login — a real banking application
 * published for automation practice. Nothing here is mocked.
 *
 * These specs deliberately do NOT use the `signedIn` fixture: they are about
 * getting signed in, so they must start signed out. Because Playwright only
 * constructs a fixture a test actually names, that costs nothing — no
 * `beforeEach` to skip around.
 *
 * The application ships seven personas with different behaviour, and three of
 * them are exercised here: the happy path, a suspended account, and a wrong
 * password. Negative paths against a real application, rather than a mocked
 * failure that resembles one.
 */
import { test, expect } from '../../src/fixtures';
import { PERSONAS, ALL_PERSONAS, SEED } from '../../src/data/personas';

test.describe('login @smoke @auth', () => {
  test.beforeEach(async ({ bank }) => {
    await bank.login.goto();
  });

  test('the sign-in form is present and correctly labelled', async ({ bank }) => {
    /* `expectLoaded` checks the page object's own ready indicator — the thing
     * whose presence means "this page is genuinely usable", not merely that a
     * navigation resolved. */
    await bank.login.expectLoaded();

    await expect(bank.login.usernameInput.locator).toBeVisible();
    await expect(bank.login.passwordInput.locator).toBeVisible();
    await expect(bank.login.submitButton.locator).toBeEnabled();

    /* Asserting the placeholder and the input type is worth doing once: the
     * type is what makes the browser mask the field and offer a password
     * manager, and it is a one-character change away from being wrong. */
    expect(await bank.login.usernameInput.getPlaceholder()).toBe('Enter username');
    expect(await bank.login.isPasswordMasked()).toBe(true);
  });

  test('a valid user reaches the dashboard', async ({ bank }) => {
    await bank.login.signInSuccessfully(PERSONAS.standard);

    /* The URL alone is a weak assertion — a SPA can change it before the page
     * is usable. Waiting for the dashboard's own ready indicator is what
     * proves the destination actually rendered. */
    await bank.dashboard.expectLoaded();
    await expect(bank.dashboard.welcomeMessage.locator).toContainText(SEED.displayName);
  });

  test('a wrong password is refused with a message @negative', async ({ bank }) => {
    const message = await bank.login.signInExpectingFailure({
      ...PERSONAS.standard,
      password: 'definitely-not-the-password',
    });

    expect(message.length).toBeGreaterThan(0);
    /* Still on the login page — a failed sign-in that navigated anyway would
     * be a serious defect, and only this assertion would catch it. */
    await expect(bank.login.page).toHaveURL(/\/bank\/login/);
  });

  test('a suspended account is refused with an explanation @negative', async ({ bank }) => {
    const message = await bank.login.signInExpectingFailure(PERSONAS.locked);

    /* The application distinguishes "wrong credentials" from "account
     * suspended", which is a real product decision worth protecting: a user
     * who is locked out needs to know it is not their typing. */
    expect(message).toMatch(/suspended|locked/i);
    await expect(bank.login.errorBanner.locator).toBeVisible();
  });

  test('the password can be revealed and re-masked', async ({ bank }) => {
    await bank.login.passwordInput.type('bank_sauce');
    expect(await bank.login.isPasswordMasked()).toBe(true);

    await bank.login.passwordVisibilityToggle.click();
    expect(await bank.login.isPasswordMasked()).toBe(false);

    /* The accessible name flips too — which is how a screen-reader user knows
     * the state changed, and is invisible to a purely visual check. */
    await expect(bank.login.page.getByRole('button', { name: /hide password/i })).toBeVisible();

    await bank.login.passwordVisibilityToggle.click();
    expect(await bank.login.isPasswordMasked()).toBe(true);
  });

  test('remember me can be selected', async ({ bank }) => {
    expect(await bank.login.rememberMeCheckbox.isCheckedState()).toBe(false);

    await bank.login.rememberMeCheckbox.check();
    await bank.login.rememberMeCheckbox.expectChecked();

    await bank.login.rememberMeCheckbox.uncheck();
    expect(await bank.login.rememberMeCheckbox.isCheckedState()).toBe(false);
  });

  test('the forgot-password link is present and reachable', async ({ bank }) => {
    await expect(bank.login.forgotPasswordLink.locator).toBeVisible();
    /* Checking the target resolves without leaving the page — cheap link
     * checking, and it catches the dead link nobody clicks. */
    expect(await bank.login.forgotPasswordLink.getHref()).toBeTruthy();
  });

  /**
   * A fixture-integrity test.
   *
   * `src/data/personas.ts` is a hand-written copy of a table the application
   * renders itself. Copies drift. This reads the real table and compares, so
   * that if the app adds, renames or repurposes an account, the suite says so
   * rather than silently testing a stale list.
   */
  test('the personas fixture matches the credentials the app publishes @contract', async ({
    bank,
  }) => {
    const published = await bank.login.publishedCredentials();

    expect(published).toHaveLength(ALL_PERSONAS.length);

    for (const persona of ALL_PERSONAS) {
      const match = published.find((row) => row.username === persona.username);
      expect(match, `the app no longer publishes "${persona.username}"`).toBeDefined();
      expect(match?.password).toBe(persona.password);
      expect(match?.description).toBe(persona.description);
    }
  });

  test('signing out returns to the login page', async ({ bank }) => {
    await bank.login.signInSuccessfully(PERSONAS.standard);
    await bank.dashboard.expectLoaded();

    await bank.dashboard.shell.logout();

    await expect(bank.login.page).toHaveURL(/\/bank\/login/);
    await bank.login.expectLoaded();
  });
});
