/** The specs: what each proves about the real application. */
export default {
  'tests/ui/login.spec.ts': {
    group: 'tests',
    purpose:
      'Authentication: the happy path, a wrong password, a suspended account, password visibility, remember-me, and a fixture-integrity check.',
    blocks: [
      {
        type: 'p',
        text: 'These specs deliberately do **not** use the `signedIn` fixture — they are about getting signed in, so they must start signed out. Because Playwright only constructs a fixture a test names, that costs nothing.',
      },
      { type: 'h3', text: 'The test that keeps the fixtures honest' },
      {
        type: 'code',
        caption: "Reading the app's own credentials table",
        text: `const published = await bank.login.publishedCredentials();

expect(published.length).toBe(ALL_PERSONAS.length);
for (const persona of ALL_PERSONAS) {
  const match = published.find((row) => row.username === persona.username);
  expect(match, \`the app no longer publishes "\${persona.username}"\`).toBeDefined();
  expect(match?.description).toBe(persona.description);
}`,
      },
      {
        type: 'p',
        text: '`src/data/personas.ts` is a hand-written copy of a table the application renders itself, and copies drift. This reads the real table and compares — so if the app adds, renames or repurposes an account, the suite says so instead of silently testing a stale list.',
      },
      {
        type: 'p',
        text: 'The password-visibility test asserts the **accessible name** flips between "Show password" and "Hide password", not just the input type. That is how a screen-reader user knows the state changed, and it is invisible to a purely visual check.',
      },
    ],
    changeWhen: ['The login form or its messages change.'],
    changeHow: [
      {
        text: 'Most changes belong in `LoginPage`, not here. These tests describe behaviour, not markup.',
      },
    ],
    why: 'Login is the gate to every other spec. A distinct message for a suspended account versus a wrong password is a real product decision worth protecting: a locked-out user needs to know it is not their typing.',
    related: ['src/pages/bank/login.page.ts', 'src/data/personas.ts'],
  },

  'tests/ui/dashboard.spec.ts': {
    group: 'tests',
    purpose:
      "Covers the application's own TC-DASH-001..006, plus the stat cards and every quick action.",
    blocks: [
      {
        type: 'p',
        text: "SecureBank publishes a catalogue of intended test cases at `/bank/test-cases`. Each test here names the case it satisfies, so coverage can be checked against the app's own specification rather than against somebody's memory.",
      },
      { type: 'h3', text: 'The assertion worth copying' },
      {
        type: 'code',
        caption: 'TC-DASH-002 compares two independent renderings',
        text: `const dashboardTotal = await signedIn.dashboard.netWorth();

await signedIn.dashboard.shell.navigateTo('accounts');
const accountsTotal = await signedIn.accounts.totalBalance();

expect(dashboardTotal).toBe(accountsTotal);`,
      },
      {
        type: 'p',
        text: 'The interesting assertion is not "is it $17,050" — that would only restate the fixture. It is that two independently rendered views of the same underlying data **agree**. A rounding bug or a stale cache in either place breaks this and nothing else.',
      },
      {
        type: 'p',
        text: 'The theme test toggles **twice**. A control that only works in one direction is a common defect, and a single click would never reveal it.',
      },
    ],
    changeWhen: ['The dashboard gains a card or a tile.'],
    changeHow: [
      {
        text: 'Add the slug to `QuickAction` in the page object; the sweep test then covers it automatically.',
      },
    ],
    why: 'The dashboard is a summary of data rendered elsewhere, which makes cross-checking the more valuable assertion than checking any single number.',
    related: ['src/pages/bank/dashboard.page.ts'],
  },

  'tests/ui/navigation.spec.ts': {
    group: 'tests',
    purpose:
      'The application shell: every sidebar destination, the brand link, the unread badge, responsive behaviour and the skip link.',
    blocks: [
      {
        type: 'p',
        text: 'A **generated test per destination** rather than one loop inside a single test. Ten separate results mean a broken link names itself in the report; one looping test would just say "navigation failed".',
      },
      { type: 'h3', text: 'A documented accessibility defect' },
      {
        type: 'warn',
        text: 'WCAG 2.4.1 requires a keyboard user to be able to skip repeated navigation. SecureBank ships the correct markup — the skip link is first in the DOM, targets a real element and works when focused — but the **first Tab bypasses it** and lands on the brand link, so a keyboard user can never reach it. Verified directly against the running application.',
      },
      {
        type: 'code',
        caption: 'Recorded with test.fail(), not skipped or deleted',
        text: `test('the skip link should be the first thing Tab reaches @a11y @known-issue', async ({ signedIn }) => {
  test.fail(true, 'Known defect: the first Tab focuses the brand link (WCAG 2.4.1).');
  await signedIn.dashboard.page.keyboard.press('Tab');
  await expect(signedIn.dashboard.page.locator(':focus')).toHaveAttribute('data-testid', 'skip-to-content');
});`,
      },
      {
        type: 'p',
        text: 'The expectation stays in the suite written as it *should* behave; the run stays green so nobody learns to ignore a permanently red test; and the moment somebody fixes it the test **fails**, telling us to remove the annotation. A skipped test would go quiet forever; a deleted one would lose the finding.',
      },
      {
        type: 'note',
        text: 'A separate passing test asserts what the skip link does do correctly. Note it checks the **bounding box**, not `toBeHidden()`: the `sr-only` pattern clips the link to 1×1 rather than hiding it, because a `display: none` element cannot be focused — so Playwright reports it as visible and `toBeHidden()` would fail for the wrong reason.',
      },
    ],
    changeWhen: ['A destination is added to the sidebar.'],
    changeHow: [
      {
        text: 'Add a row to the `DESTINATIONS` table; the per-destination test is generated from it.',
      },
    ],
    why: 'Chrome that appears on every page deserves one spec, not an assertion repeated in ten.',
    related: ['src/pages/bank/bank-shell.ts', 'tests/a11y/bank.a11y.spec.ts'],
  },

  'tests/ui/accounts.spec.ts': {
    group: 'tests',
    purpose:
      'Covers TC-ACC-001..006 across three personas, plus the add dialog and the detail page.',
    blocks: [
      {
        type: 'p',
        text: 'The overdraft and frozen personas exist precisely so those states are reachable **without inventing them**. TC-ACC-003 asserts not merely that a balance is negative but that the interface *says so* — a number the user cannot interpret is not a warning.',
      },
      { type: 'h3', text: 'A second documented defect' },
      {
        type: 'warn',
        text: 'The account dialog has `role="dialog"` and an accessible name, but **no `aria-modal="true"`**. Without it a screen reader is not told to confine the user to the dialog, so they can arrow out into the page behind it while it is open — a confusing state sighted users never see. Recorded with `test.fail()`; a companion test asserts what the dialog does do correctly.',
      },
      {
        type: 'p',
        text: 'The cancel test asserts nothing was persisted. A dialog that saves on cancel is a genuine and surprisingly common defect, and only an explicit before/after comparison catches it.',
      },
    ],
    changeWhen: ['The account form or list changes.'],
    changeHow: [{ text: 'Update `AccountsPage`; these tests describe behaviour.' }],
    why: 'Three personas in one spec is what turns "the list renders" into coverage of the states a real customer can actually be in.',
    related: ['src/pages/bank/accounts.page.ts'],
  },

  'tests/ui/transfer.spec.ts': {
    group: 'tests',
    purpose:
      'Covers TC-XFER-001..006: form loading, validation, the confirmation step, the success page, and the resulting balances.',
    blocks: [
      {
        type: 'p',
        text: 'The most valuable suite here, because a transfer is the one action in a banking application that moves real money and has to be right in three separate places.',
      },
      {
        type: 'code',
        caption: 'TC-XFER-006 — both sides and the total',
        text: `expect(fromAfter).toBeCloseTo(fromBefore - amount, 2);
expect(toAfter).toBeCloseTo(toBefore + amount, 2);
expect(fromAfter + toAfter).toBeCloseTo(fromBefore + toBefore, 2);`,
      },
      {
        type: 'p',
        text: 'Checking only the source would miss money that left one account and never arrived; checking only the total would miss it going to the wrong place. The starting position is read **from the application**, not from the fixture, so the test stays correct if the seed data changes.',
      },
      {
        type: 'p',
        text: 'TC-XFER-004 asserts the confirmation summary echoes what was requested. An application that confirms a different amount from the one submitted is the worst possible defect in this domain, and only that assertion catches it.',
      },
      {
        type: 'note',
        text: 'TC-XFER-002 asserts the destination list **excludes** the chosen source. The application prevents a same-account transfer structurally rather than by validating afterwards — a better design, and asserting the mechanism the app really uses is more honest than forcing an invalid selection to produce a message that never appears.',
      },
    ],
    changeWhen: ['The transfer flow changes.'],
    changeHow: [{ text: 'Update `TransferPage`. If a step is added, model it there first.' }],
    why: 'Money movement is where a UI suite earns its keep. A cancelled confirmation must be a genuine no-op, and that is asserted too.',
    related: ['src/pages/bank/transfer.page.ts'],
  },

  'tests/ui/transactions.spec.ts': {
    group: 'tests',
    purpose:
      'Covers TC-TXN-001..006: loading, search, empty state, account filter, sorting, pagination, the type filter and the CSV export.',
    blocks: [
      { type: 'h3', text: 'An assertion that had to be corrected' },
      {
        type: 'note',
        text: 'An earlier draft asserted that clicking sort twice produced the reverse of the first page. It failed against entirely correct behaviour: sorting applies to all 18 transactions while only 10 are shown, so descending page 1 holds the largest ten and ascending page 1 the smallest — two different slices, not a reversal. Comparing the *directions* is the assertion that actually catches a sort control ignoring the second click.',
      },
      {
        type: 'p',
        text: 'The search term is taken from the data itself rather than hard-coded, so the test does not depend on a description that may not exist tomorrow.',
      },
      {
        type: 'p',
        text: 'The empty-state test asserts the message, not just zero rows: a table rendering nothing looks identical to one that failed to load, and the user cannot tell which happened.',
      },
      {
        type: 'p',
        text: "The CSV test uses Playwright's download event — the only way to prove a download happened, since there is no DOM to assert on — and reads the stream to check the file is not empty.",
      },
    ],
    changeWhen: ['A filter, column or page size changes.'],
    changeHow: [{ text: 'Update `SEED` for a page-size change; nine specs read from it.' }],
    why: 'Pagination and sorting are where a table stops being a list and starts being a feature, and both have boundaries that only an explicit test visits.',
    related: ['src/pages/bank/transactions.page.ts', 'src/data/personas.ts'],
  },

  'tests/ui/money-movement.spec.ts': {
    group: 'tests',
    purpose: 'Covers TC-SEND-001..006 and TC-BILL-001..006 — the two external payment flows.',
    blocks: [
      {
        type: 'p',
        text: 'Two flows in one file because they share a shape: pick a source account, pick or create a recipient, enter an amount, review. Splitting them would duplicate the reasoning without separating anything.',
      },
      {
        type: 'p',
        text: 'TC-SEND-004 asserts a saved payee **appears in the dropdown afterwards**. Asserting the dialog closed would prove nothing at all.',
      },
      {
        type: 'p',
        text: 'Both flows are asserted blocked for the frozen persona — disabled controls, not merely rejected submissions, which is the correct treatment for a blocked account.',
      },
    ],
    changeWhen: ['Either payment form changes.'],
    changeHow: [
      {
        text: 'Update the page object; check which fields are required by submitting without them.',
      },
    ],
    why: 'A "saved" record that cannot be found again has not been saved in any sense the user cares about.',
    related: ['src/pages/bank/send-money.page.ts', 'src/pages/bank/bill-pay.page.ts'],
  },

  'tests/ui/apply-loan.spec.ts': {
    group: 'tests',
    purpose:
      "Covers TC-LOAN-001..006 — including **reproducing the application's planted defect**.",
    blocks: [
      { type: 'h3', text: 'The most valuable test in the repository' },
      {
        type: 'p',
        text: 'SecureBank deliberately ships a bug for `error_user`: the total beneath the loan history omits the most recent loan. TC-LOAN-004 asks for it to be reproduced, and this is the one test that proves the framework can **find** something rather than confirm things work.',
      },
      {
        type: 'code',
        caption: 'Written as it would be against a real system',
        text: `const displayed = await bank.applyLoan.displayedTotal();
const expected = await bank.applyLoan.expectedActiveTotal();

expect(displayed, \`shows \${displayed} but the active and pending loans sum to \${expected}\`)
  .toBeCloseTo(expected, 2);`,
      },
      {
        type: 'p',
        text: 'Measured: `standard_user` shows $39,300 and its active loans sum to $39,300. `error_user` has identical rows but shows $24,300 — short by exactly the $15,000 newest pending loan.',
      },
      {
        type: 'rule',
        text: 'A control test asserts the same comparison **passes** for a healthy account. Without it, a failing total for `error_user` could just as easily mean the assertion is wrong. That control is what makes the planted-defect result trustworthy.',
      },
      {
        type: 'note',
        text: 'Getting the comparison right took two attempts. The total is labelled "Total (Active/Pending)" and the history paginates at five rows, so comparing it against the visible page is wrong twice over — it misses later pages and includes closed loans. `expectedActiveTotal()` walks the pages and filters by status.',
      },
    ],
    changeWhen: [
      'The defect is fixed — this test will then fail and the annotation should be removed.',
    ],
    changeHow: [
      { text: 'Remove the `test.fail()` line. That is the whole point of recording it this way.' },
    ],
    why: 'A suite that has never caught anything is a suite nobody trusts. This is the demonstration.',
    related: ['src/pages/bank/apply-loan.page.ts', 'src/data/personas.ts'],
  },

  'tests/ui/account-settings.spec.ts': {
    group: 'tests',
    purpose:
      "Notifications and profile — the two pages the application's catalogue does not cover.",
    blocks: [
      {
        type: 'p',
        text: 'Included because "all UI" means all of it, and because between them they exercise three widget types nothing else does: a list with per-item actions, an inline edit form and an ARIA switch.',
      },
      {
        type: 'p',
        text: 'The notification tests assert **three renderings of one number** agree — the page count, the per-item controls and the sidebar badge. A stale badge is a classic defect and is invisible from the page itself.',
      },
      {
        type: 'p',
        text: 'The profile test asserts explicitly that editing produces an inline form and **no** `[role="dialog"]` — the surprise on that page, and the thing a page object written from the pattern used elsewhere would get wrong.',
      },
      {
        type: 'p',
        text: 'All three password fields are checked for `type="password"`. A confirm field rendering as plain text is a genuine and common oversight.',
      },
    ],
    changeWhen: ['Either page changes.'],
    changeHow: [{ text: 'Update the page object.' }],
    why: 'The pages nobody specifies are the pages nobody tests, which is exactly why they are worth covering.',
    related: ['src/pages/bank/notifications.page.ts', 'src/pages/bank/profile.page.ts'],
  },

  'tests/a11y/bank.a11y.spec.ts': {
    group: 'tests',
    purpose:
      "Automated axe scans across all ten pages and both themes, with the application's existing violations baselined.",
    blocks: [
      { type: 'h3', text: 'The baseline approach, and why it is not a climbdown' },
      {
        type: 'p',
        text: 'SecureBank has two genuine WCAG 2 AA violations, found by this suite. We do not control the application, so a suite that simply failed on them would be red forever — and a permanently red suite is one people stop reading, which loses every *future* violation too.',
      },
      {
        type: 'table',
        head: ['Rule', 'Impact', 'Where'],
        rows: [
          ['`color-contrast`', 'serious', 'dashboard, transactions, apply-loan, notifications'],
          ['`aria-prohibited-attr`', 'serious', 'notifications'],
        ],
      },
      {
        type: 'p',
        text: 'The contrast failure is a green (`#009966`) on white at 14px measuring 3.65:1 against the 4.5:1 WCAG 1.4.3 requires — close enough to look fine and far enough to fail, which is exactly what only a tool catches.',
      },
      {
        type: 'rule',
        text: 'The known rules are excluded from the gating scans, so **any new violation fails the build**, while a separate never-failing test reports the full backlog every run. That is the standard way to adopt accessibility testing on an application that already has issues; the alternative — "fix everything before you can test anything" — is how it never gets adopted at all.',
      },
      {
        type: 'p',
        text: 'A third defect is recorded here with `test.fail()`: three controls on the transfer page have no accessible name. axe does not flag them, which is precisely the class of issue an automated scan misses and a hand-written check catches.',
      },
      {
        type: 'note',
        text: 'Honest limits: axe detects roughly a third of WCAG issues. It cannot judge whether a focus order makes sense or whether an error message is comprehensible. The keyboard tests in `navigation.spec.ts` cover part of what it misses.',
      },
    ],
    changeWhen: ['A baselined violation is fixed.', 'A page is added.'],
    changeHow: [
      {
        text: 'Remove the rule from `KNOWN_VIOLATIONS` once it passes. **Shrink this list; never grow it.** A rule removed and passing is progress the suite then protects.',
      },
      { text: 'Add the slug to `PAGES`; the per-page test is generated from it.' },
    ],
    why: 'Scanning ten pages is cheap because `checkAccessibility` lives on BasePage. What costs judgement is deciding what to gate on, and that decision is written down here.',
    related: ['src/utils/a11y.utils.ts', 'tests/ui/navigation.spec.ts'],
  },

  'tests/visual/bank.visual.spec.ts': {
    group: 'tests',
    purpose:
      'Visual regression on the login page, the dashboard cards, the sidebar in both themes, the transfer form and the empty transactions state.',
    blocks: [
      { type: 'h3', text: 'What makes a visual test worth having rather than an annoyance' },
      {
        type: 'ol',
        items: [
          '**Stabilise before capturing.** Animations, carets and — here — live monetary figures all change between runs. Every balance is masked; what remains under test is the *layout*.',
          '**Capture the smallest meaningful region.** A full-page snapshot fails when anything anywhere changes, so it tells you a page changed without telling you what. Component-level snapshots point at the thing that moved.',
        ],
      },
      {
        type: 'p',
        text: 'Masking is not skipping: the numbers are covered and the card layout is compared. Masking the volatile part is what makes the stable part testable at all.',
      },
      {
        type: 'p',
        text: 'The sidebar is captured in **both themes**. A palette regression that only affects dark mode is invisible to a light-mode baseline.',
      },
      {
        type: 'note',
        text: 'The login page is the one page captured whole, because it has no balances and no dates — nothing that legitimately varies.',
      },
    ],
    changeWhen: ['A deliberate design change makes a baseline stale.'],
    changeHow: [
      {
        text: 'Refresh baselines deliberately, never as a reflex.',
        code: `npm run test:visual:update`,
      },
      {
        text: 'Review the resulting image diff before committing it — that review is the entire value of the test.',
      },
    ],
    why: 'Layout, spacing and alignment are what a screenshot is good at and an assertion is bad at. Everything else should be an assertion.',
  },
};
