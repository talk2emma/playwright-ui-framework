import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import type { Page } from '@playwright/test';
import type { Button } from '../../components/form/button';
import type { SelectorLike } from '../../types';
import type { Persona } from '../../data/personas';

/**
 * The SecureBank sign-in page.
 *
 * It is the only page a test can reach without authenticating, which makes it
 * the entry point for every other page object.
 */
export class LoginPage extends BasePage {
  protected readonly path = '/bank/login';
  protected readonly readyIndicator: SelectorLike = '[data-testid="login-form"]';

  private readonly factory: UiFactory;

  /* Form ----------------------------------------------------------------- */
  readonly usernameInput;
  readonly passwordInput;
  readonly rememberMeCheckbox;
  readonly submitButton;
  readonly forgotPasswordLink;

  /* Feedback -------------------------------------------------------------- */
  readonly errorBanner;
  readonly errorMessage;

  /* The published credentials table, which the application renders itself. */
  readonly credentialsPanel;
  readonly credentialsTable;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);

    this.usernameInput = this.factory.input('[data-testid="login-username-input"]', {
      name: 'Username',
    });
    this.passwordInput = this.factory.input('[data-testid="login-password-input"]', {
      name: 'Password',
    });
    this.rememberMeCheckbox = this.factory.checkbox('[data-testid="login-remember-me-checkbox"]', {
      name: 'Remember me',
    });
    this.submitButton = this.factory.button('[data-testid="login-submit-btn"]', {
      name: 'Sign In',
    });
    this.forgotPasswordLink = this.factory.link('[data-testid="forgot-password-link"]', {
      name: 'Forgot password?',
    });

    this.errorBanner = this.factory.alert('[data-testid="login-error-banner"]', {
      name: 'Login error',
    });
    this.errorMessage = this.factory.alert('[data-testid="login-error-message"]', {
      name: 'Login error message',
    });

    this.credentialsPanel = this.factory.card('[data-testid="test-credentials-panel"]', {
      name: 'Test credentials',
    });
    this.credentialsTable = this.factory.table('[data-testid="test-credentials-table"]', {
      name: 'Test credentials',
    });
  }

  /**
   * The password-visibility control.
   *
   * Located by accessible name because it carries no test id, and because the
   * name is itself the thing worth asserting — it flips between "Show
   * password" and "Hide password", which is how a screen-reader user knows the
   * state changed.
   */
  get passwordVisibilityToggle(): Button {
    return this.factory.button(this.page.getByRole('button', { name: /(show|hide) password/i }), {
      name: 'Toggle password visibility',
    });
  }

  /* Business actions ------------------------------------------------------ */

  /**
   * Fills the form and submits it. Does **not** assert the outcome — a login
   * that is expected to fail uses exactly the same call.
   */
  async signIn(persona: Persona, options: { rememberMe?: boolean } = {}): Promise<void> {
    await this.usernameInput.type(persona.username);
    await this.passwordInput.type(persona.password);
    if (options.rememberMe) await this.rememberMeCheckbox.check();
    await this.submitButton.click();
  }

  /**
   * Signs in and waits for the dashboard.
   *
   * The wait is on the **URL**, not on a timeout: the application shows a
   * "Signing in…" state first, and a test that continued at that point would
   * assert against a page still in flight.
   */
  async signInSuccessfully(persona: Persona): Promise<void> {
    await this.signIn(persona);
    await this.page.waitForURL(/\/bank\/dashboard/, { timeout: 30_000 });
  }

  /** Signs in expecting refusal, and returns the message the app displayed. */
  async signInExpectingFailure(persona: Persona): Promise<string> {
    await this.signIn(persona);
    await this.errorMessage.waitForVisible();
    return (await this.errorMessage.getText()).trim();
  }

  /** Whether the password field is currently masked. */
  async isPasswordMasked(): Promise<boolean> {
    return (await this.passwordInput.getAttribute('type')) === 'password';
  }

  /**
   * The credentials the application publishes, read from its own table.
   *
   * Used by one test to cross-check `src/data/personas.ts` against reality —
   * if the app adds or renames an account, that fixture is now wrong and the
   * suite should say so rather than silently testing a stale list.
   */
  async publishedCredentials(): Promise<
    { username: string; password: string; description: string }[]
  > {
    const rows = this.page.locator('[data-testid="credential-row"]');
    const count = await rows.count();
    const parsed: { username: string; password: string; description: string }[] = [];

    for (let index = 0; index < count; index += 1) {
      const cells = rows.nth(index).locator('td');
      parsed.push({
        username: (await cells.nth(0).innerText()).trim(),
        password: (await cells.nth(1).innerText()).trim(),
        description: (await cells.nth(2).innerText()).trim(),
      });
    }
    return parsed;
  }
}
