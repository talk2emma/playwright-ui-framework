import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import type { Page } from '@playwright/test';
import type { SelectorLike } from '../../types';

/**
 * Profile, password change and security settings.
 *
 * Notable because the "edit" affordance is **not a dialog** — it replaces the
 * read-only display with an inline form. A page object that assumed a modal
 * would wait forever, which is why this was checked against the running
 * application rather than assumed from the pattern used elsewhere.
 */
export class ProfilePage extends BasePage {
  protected readonly path = '/bank/profile';
  protected readonly readyIndicator: SelectorLike = '[data-testid="profile-page"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  /* Read-only display. */
  readonly display;
  readonly username;
  readonly firstName;
  readonly lastName;
  readonly email;
  readonly phone;
  readonly address;
  readonly editButton;

  /* The inline edit form. */
  readonly editForm;
  readonly firstNameInput;
  readonly lastNameInput;
  readonly emailInput;
  readonly phoneInput;
  readonly addressInput;
  readonly saveProfileButton;
  readonly cancelEditButton;

  /* Password change. */
  readonly currentPasswordInput;
  readonly newPasswordInput;
  readonly confirmPasswordInput;
  readonly savePasswordButton;

  /* Security. */
  readonly twoFactorToggle;
  readonly resetDataButton;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.display = this.factory.card('[data-testid="profile-display"]', { name: 'Profile' });
    this.username = this.factory.card('[data-testid="profile-username"]', { name: 'Username' });
    this.firstName = this.factory.card('[data-testid="profile-first-name"]', {
      name: 'First name',
    });
    this.lastName = this.factory.card('[data-testid="profile-last-name"]', { name: 'Last name' });
    this.email = this.factory.card('[data-testid="profile-email"]', { name: 'Email' });
    this.phone = this.factory.card('[data-testid="profile-phone"]', { name: 'Phone' });
    this.address = this.factory.card('[data-testid="profile-address"]', { name: 'Address' });
    this.editButton = this.factory.button('[data-testid="edit-profile-btn"]', {
      name: 'Edit profile',
    });

    this.editForm = this.factory.form('[data-testid="profile-edit-form"]', {
      name: 'Edit profile',
    });
    this.firstNameInput = this.factory.input('[data-testid="profile-first-name-input"]', {
      name: 'First name',
    });
    this.lastNameInput = this.factory.input('[data-testid="profile-last-name-input"]', {
      name: 'Last name',
    });
    this.emailInput = this.factory.input('[data-testid="profile-email-input"]', { name: 'Email' });
    this.phoneInput = this.factory.input('[data-testid="profile-phone-input"]', { name: 'Phone' });
    this.addressInput = this.factory.input('[data-testid="profile-address-input"]', {
      name: 'Address',
    });
    this.saveProfileButton = this.factory.button('[data-testid="save-profile-btn"]', {
      name: 'Save profile',
    });
    this.cancelEditButton = this.factory.button('[data-testid="cancel-edit-profile-btn"]', {
      name: 'Cancel',
    });

    this.currentPasswordInput = this.factory.input('[data-testid="current-password-input"]', {
      name: 'Current password',
    });
    this.newPasswordInput = this.factory.input('[data-testid="new-password-input"]', {
      name: 'New password',
    });
    this.confirmPasswordInput = this.factory.input('[data-testid="confirm-password-input"]', {
      name: 'Confirm password',
    });
    this.savePasswordButton = this.factory.button('[data-testid="save-password-btn"]', {
      name: 'Change password',
    });

    /* `button[role="switch"]` with `aria-checked` — the ARIA switch pattern,
     * which is exactly what the Toggle component reads. */
    this.twoFactorToggle = this.factory.toggle('[data-testid="two-fa-toggle"]', {
      name: 'Two-factor authentication',
    });
    this.resetDataButton = this.factory.button('[data-testid="reset-data-btn"]', {
      name: 'Reset data',
    });
  }

  /** Switches the profile section into edit mode. */
  async startEditing(): Promise<void> {
    await this.editButton.click();
    await this.editForm.waitForVisible();
  }

  /** Edits the profile and saves, returning to the read-only display. */
  async updateProfile(changes: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }): Promise<void> {
    await this.startEditing();
    if (changes.firstName !== undefined) await this.firstNameInput.type(changes.firstName);
    if (changes.lastName !== undefined) await this.lastNameInput.type(changes.lastName);
    if (changes.email !== undefined) await this.emailInput.type(changes.email);
    await this.saveProfileButton.click();
    await this.display.waitForVisible();
  }
}
