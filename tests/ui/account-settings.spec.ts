/**
 * ===========================================================================
 * Notifications and Profile
 * ===========================================================================
 *
 * The two pages the application's own catalogue does not cover, included
 * because "all UI" means all of it — and because between them they exercise
 * three widget types nothing else does: a list with per-item actions, an
 * inline edit form, and an ARIA switch.
 */
import { test, expect } from '../../src/fixtures';
import { PERSONAS, SEED } from '../../src/data/personas';

test.describe('notifications @regression @notifications', () => {
  test('the list loads with the seeded unread count @smoke', async ({ signedIn }) => {
    await signedIn.notifications.goto();
    await signedIn.notifications.expectLoaded();

    expect(await signedIn.notifications.itemCount()).toBeGreaterThan(0);
    expect(await signedIn.notifications.unreadCount()).toBe(SEED.unreadNotifications);

    /* Unread items are exactly the ones offering a "mark as read" control —
     * two renderings of the same state, which must agree. */
    expect(await signedIn.notifications.unreadItemCount()).toBe(SEED.unreadNotifications);
  });

  test('marking one as read decrements the count and the badge', async ({ signedIn }) => {
    await signedIn.notifications.goto();
    const before = await signedIn.notifications.unreadCount();

    await signedIn.notifications.markFirstAsRead();

    expect(await signedIn.notifications.unreadCount()).toBe(before - 1);
    /* The sidebar badge is a third rendering of the same number. A stale badge
     * is a classic defect and is invisible from the page itself. */
    expect(await signedIn.notifications.shell.unreadCount()).toBe(before - 1);
  });

  test('marking all as read clears the count and removes the badge', async ({ signedIn }) => {
    await signedIn.notifications.goto();
    await signedIn.notifications.markAllAsRead();

    /*
     * The count element is REMOVED from the DOM rather than set to "0", so
     * this is read as absence. A test that waited for the text "0" would hang
     * until its timeout and report a misleading failure — which is exactly why
     * `unreadCount()` handles absence rather than each test doing so.
     */
    expect(await signedIn.notifications.unreadCount()).toBe(0);
    expect(await signedIn.notifications.unreadItemCount()).toBe(0);
    expect(await signedIn.notifications.shell.unreadCount()).toBe(0);

    /* The notifications themselves must survive being read. */
    expect(await signedIn.notifications.itemCount()).toBeGreaterThan(0);
  });
});

test.describe('profile @regression @profile', () => {
  test('the profile shows the signed-in user @smoke', async ({ signedIn }) => {
    await signedIn.profile.goto();
    await signedIn.profile.expectLoaded();

    await expect(signedIn.profile.username.locator).toContainText(PERSONAS.standard.username);
    await expect(signedIn.profile.email.locator).toContainText('@');
  });

  test('editing replaces the display with an inline form, not a dialog', async ({ signedIn }) => {
    await signedIn.profile.goto();

    /*
     * Worth asserting explicitly because it is the surprise on this page.
     * Every other "edit" in the application opens a dialog; this one swaps the
     * section in place. A page object written from the pattern used elsewhere
     * would wait for a modal that never appears.
     */
    await signedIn.profile.startEditing();

    await expect(signedIn.profile.editForm.locator).toBeVisible();
    await expect(signedIn.profile.page.locator('[role="dialog"]')).toHaveCount(0);
  });

  test('a profile change is saved and displayed', async ({ signedIn }) => {
    await signedIn.profile.goto();

    const newFirstName = `Robin${Date.now().toString().slice(-4)}`;
    await signedIn.profile.updateProfile({ firstName: newFirstName });

    /* Back on the read-only display, showing the new value — saving without
     * reflecting the change is a defect a "did it submit" test would miss. */
    await expect(signedIn.profile.firstName.locator).toContainText(newFirstName);
  });

  test('cancelling an edit discards the change', async ({ signedIn }) => {
    await signedIn.profile.goto();
    const original = await signedIn.profile.firstName.getText();

    await signedIn.profile.startEditing();
    await signedIn.profile.firstNameInput.type('Discarded');
    await signedIn.profile.cancelEditButton.click();

    await expect(signedIn.profile.display.locator).toBeVisible();
    expect(await signedIn.profile.firstName.getText()).toBe(original);
  });

  test('two-factor authentication is an ARIA switch that toggles', async ({ signedIn }) => {
    await signedIn.profile.goto();

    /* `button[role="switch"]` with `aria-checked` — the ARIA switch pattern,
     * which is what makes the control announce its state. The Toggle component
     * reads that attribute rather than a native `checked` property. */
    await expect(signedIn.profile.twoFactorToggle.locator).toHaveAttribute('role', 'switch');

    const before = await signedIn.profile.twoFactorToggle.isOn();
    const after = await signedIn.profile.twoFactorToggle.toggle();

    expect(after).toBe(!before);

    /* And back — a switch that only works one way is a real defect. */
    await signedIn.profile.twoFactorToggle.set(before);
    expect(await signedIn.profile.twoFactorToggle.isOn()).toBe(before);
  });

  test('the change-password form requires all three fields', async ({ signedIn }) => {
    await signedIn.profile.goto();

    await expect(signedIn.profile.currentPasswordInput.locator).toBeVisible();
    await expect(signedIn.profile.newPasswordInput.locator).toBeVisible();
    await expect(signedIn.profile.confirmPasswordInput.locator).toBeVisible();

    /* All three must be masked. A confirm field that renders as plain text is
     * a genuine and surprisingly common oversight. */
    for (const field of [
      signedIn.profile.currentPasswordInput,
      signedIn.profile.newPasswordInput,
      signedIn.profile.confirmPasswordInput,
    ]) {
      expect(await field.getInputType()).toBe('password');
    }
  });
});
