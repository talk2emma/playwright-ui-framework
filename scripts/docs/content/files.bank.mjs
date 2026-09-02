/** SecureBank page objects, personas and the fixture that wires them up. */
export default {
  'src/data/personas.ts': {
    group: 'data',
    purpose:
      'The seven SecureBank accounts and the facts about the seeded dataset that tests assert against.',
    blocks: [
      { type: 'h3', text: 'Why credentials are in the repository' },
      {
        type: 'p',
        text: 'The framework\'s rule is that credentials never enter version control, and it is not being bent here. These are **published on the application\'s own login page**, in a table headed "Test credentials", for anyone to read. They authenticate nothing and protect nothing.',
      },
      {
        type: 'p',
        text: 'Treating them as secrets would mean handing every developer a `.env` before they could run a single test against a public practice app — ceremony with no security benefit. `getUser()` in `env.config.ts` remains the only route for credentials in every other environment.',
      },
      { type: 'h3', text: 'The personas are the point' },
      {
        type: 'table',
        head: ['Persona', 'Behaviour', 'What it makes testable'],
        rows: [
          ['`standard`', 'Full access', 'Every happy path'],
          ['`locked`', 'Sign-in refused as suspended', 'A distinct message from a wrong password'],
          [
            '`frozen`',
            'Signs in; money movement disabled',
            'Transfer, send and bill-pay all blocked',
          ],
          ['`overdraft`', 'Negative balance', 'The overdraft indicator'],
          ['`slow`', 'Slow loading', 'Real loading states'],
          [
            '`buggy` (`error_user`)',
            '**A planted defect** in the loan total',
            'Proving the suite can find a bug',
          ],
          ['`admin`', 'Additional view', 'Role-dependent chrome'],
        ],
      },
      {
        type: 'p',
        text: 'Negative paths and degraded states are reachable by **logging in as somebody else**, rather than by mocking a failure and hoping the mock resembles reality. That is unusual and worth exploiting.',
      },
      { type: 'h3', text: 'SEED — dataset facts, read from the running app' },
      {
        type: 'note',
        text: 'Every value in `SEED` was read from the application, not from its documentation. One of them was originally wrong: `totalTransactions` was recorded as 20 from a session that had already performed a transfer — each completed transfer adds a debit and a matching credit. The true figure in a fresh context is 18. **Seed values must be read from a clean context**, or they encode whatever the person exploring happened to do first.',
      },
    ],
    changeWhen: ['The application reseeds.', 'A persona is added or changes behaviour.'],
    changeHow: [
      { text: 'Update the constant. Nine specs read from `SEED`, so one edit covers all of them.' },
      {
        text: "Run the fixture-integrity test, which reads the app's own credentials table and compares it with this file.",
        code: `npx playwright test -g "personas fixture matches"`,
      },
    ],
    why: 'A hand-written copy of a table the application renders itself will drift. Keeping the copy in one file, and testing it against the source, is what stops that drift being silent.',
    gotchas: [
      'Read seed values from a fresh browser context. State lives in `localStorage`, so an exploratory session pollutes them.',
    ],
    related: ['tests/ui/login.spec.ts', 'src/fixtures/bank.fixture.ts'],
  },

  'src/fixtures/bank.fixture.ts': {
    group: 'fixtures',
    purpose:
      'Provides every page object ready-made, plus `signedIn` and `signInAs` for tests that need an authenticated session.',
    blocks: [
      { type: 'h3', text: 'Why there is no cleanup' },
      {
        type: 'rule',
        text: 'SecureBank keeps all its state in `localStorage` under `bank-app-v4`, and Playwright gives every test a **fresh browser context**. Every test therefore starts from the seeded dataset automatically: no cleanup step, no shared account to fight over, no ordering constraints. That is what lets this suite run fully parallel against a single shared demo application — normally the hardest problem in UI automation.',
      },
      { type: 'h3', text: 'Why sign-in is a fixture rather than a `beforeEach`' },
      {
        type: 'p',
        text: 'A fixture is constructed only when a test names it, so the login specs — which must start signed *out* — simply do not ask for `signedIn` and pay nothing. A `beforeEach` would run for them too and would have to be skipped around.',
      },
      {
        type: 'code',
        caption: 'Three levels of access',
        text: `test('…', async ({ bank }) => { … });        // page objects, signed out
test('…', async ({ signedIn }) => { … });    // signed in as the standard persona
test('…', async ({ signInAs }) => {          // signed in as anyone
  const app = await signInAs('frozen');
});`,
      },
      {
        type: 'p',
        text: 'The layering is `base → auth → bank`, each adding fixtures without the layer below knowing about it — so a project that deletes the bank suite loses nothing else.',
      },
    ],
    changeWhen: ['You add a page object.', 'A test needs a differently-prepared session.'],
    changeHow: [
      {
        text: 'Add the page to `BankPages` and construct it in the `bank` fixture — two lines, and every test can reach it.',
      },
    ],
    why: 'Constructing eleven page objects in every spec would be eleven lines of noise per file. Doing it once, lazily, is what keeps a spec about the behaviour it is testing.',
    gotchas: [
      'Page objects only build locators, so constructing all eleven is essentially free — no page is loaded until a test navigates.',
    ],
    related: ['src/pages/bank/index.ts', 'src/fixtures/index.ts', 'src/data/personas.ts'],
  },

  'src/pages/bank/bank-shell.ts': {
    group: 'pages',
    purpose:
      'The application chrome — top bar and sidebar — modelled once as a component and composed into every page object.',
    blocks: [
      {
        type: 'p',
        text: 'A **component, not a page object**: it has no URL of its own and appears on ten pages. Modelling it once means a navigation change is one edit rather than ten, and keeps each page object about that page.',
      },
      { type: 'h3', text: 'The theme toggle has no test id' },
      {
        type: 'p',
        text: 'It is located by accessible name instead. That is not a workaround — an accessible-name locator asserts something a test id cannot: that the control is announced correctly to a screen reader. If the label were removed, this locator would fail, and it should.',
      },
      { type: 'h3', text: 'Two bugs this file records' },
      {
        type: 'code',
        caption: 'The state must be read BEFORE the click',
        text: `const wasDark = await this.isDarkMode();
await this.themeToggle.click();
await this.page.waitForFunction(
  (previous) => document.documentElement.classList.contains('dark') !== previous,
  wasDark,
);`,
      },
      {
        type: 'p',
        text: 'An earlier version read the mode *after* clicking and passed the already-changed value into the wait, so the condition could never become true. Cheap mistake, expensive symptom: it looked like the application failed to switch theme.',
      },
      {
        type: 'warn',
        text: 'Opening the mobile drawer renders a **second** `[data-testid="bank-sidebar"]`, so an unscoped lookup fails strict mode and `.first()` silently picks the hidden desktop copy — an assertion that can never pass. `mobileNavLink()` scopes to the overlay, which is the only correct answer.',
      },
    ],
    changeWhen: ['The navigation gains a destination.', 'The chrome changes.'],
    changeHow: [
      {
        text: 'Add the slug to `NavDestination`. The compiler then lists every place that must handle it, and `navLink()` works without further change.',
      },
    ],
    why: 'Anything on every page belongs in one component. Re-asserting the sidebar in ten specs would be ten places to update and ten chances to disagree.',
    gotchas: [
      'The unread badge is **removed** from the DOM at zero, so `unreadCount()` reads absence as zero rather than waiting for the text "0".',
    ],
    related: ['tests/ui/navigation.spec.ts', 'src/pages/bank/index.ts'],
  },

  'src/pages/bank/dropdown-panel.ts': {
    group: 'pages',
    purpose: 'The `VISIBLE_LISTBOX` selector every custom dropdown in the application shares.',
    blocks: [
      { type: 'code', text: `export const VISIBLE_LISTBOX = '[role="listbox"]:visible';` },
      {
        type: 'p',
        text: 'The application renders each dropdown panel as a `[role="listbox"]` and **leaves it in the DOM when it closes**, merely hidden. On the transfer page, once "From" has been used there are two listboxes: the closed one and the one being opened.',
      },
      {
        type: 'warn',
        text: 'A plain `[role="listbox"]` therefore resolves to the *first* match — the hidden one — and the Dropdown component waits for it to become visible until it times out. The failure reads "waiting for [role=listbox] to be visible" while a perfectly good panel is open a few pixels away. That is about as misleading as a failure gets, and it cost a debugging cycle to find.',
      },
      {
        type: 'p',
        text: "`:visible` is Playwright's own pseudo-class and resolves to whichever panel is open. It is preferred over per-dropdown container test ids because the application provides those only inconsistently.",
      },
    ],
    changeWhen: ['The application changes how it renders dropdown panels.'],
    changeHow: [{ text: 'Change the constant. Every dropdown in every page object picks it up.' }],
    why: 'One shared constant with the reasoning attached, rather than the same subtle selector repeated in six files with the reasoning nowhere.',
    related: ['src/components/form/dropdown.ts', 'src/pages/bank/transfer.page.ts'],
  },

  'src/pages/bank/login.page.ts': {
    group: 'pages',
    purpose:
      'The sign-in page — the only page reachable without authenticating, and therefore the entry point for every other page object.',
    blocks: [
      {
        type: 'code',
        caption: 'Failure and success share one method',
        text: `async signIn(persona: Persona, options: { rememberMe?: boolean } = {}): Promise<void> { … }
async signInSuccessfully(persona: Persona): Promise<void> { … }   // waits for the dashboard
async signInExpectingFailure(persona: Persona): Promise<string> { … }  // returns the message`,
      },
      {
        type: 'p',
        text: '`signIn` does not assert the outcome, so a login expected to fail uses exactly the same call. The two wrappers make the *intent* explicit at the call site without duplicating the form filling.',
      },
      {
        type: 'note',
        text: '`signInSuccessfully` waits for the **URL**, not for a timeout. The application shows a "Signing in…" state first, and a test that continued at that point would assert against a page still in flight.',
      },
      {
        type: 'p',
        text: "`publishedCredentials()` reads the application's own credentials table, which is what lets one test cross-check `src/data/personas.ts` against reality.",
      },
    ],
    changeWhen: ['The login form changes.', 'A new field is added.'],
    changeHow: [
      {
        text: 'Update the component declarations. `src/hooks/auth.setup.ts` delegates here, so the setup project follows automatically.',
      },
    ],
    why: 'Login is used by every other spec indirectly. Concentrating it here means a login change is one edit rather than a suite-wide failure.',
    related: ['tests/ui/login.spec.ts', 'src/hooks/auth.setup.ts'],
  },

  'src/pages/bank/dashboard.page.ts': {
    group: 'pages',
    purpose:
      'The landing page: net-worth cards, quick-action tiles and the recent-activity widget. Also exports `parseCurrency`, which six page objects share.',
    blocks: [
      {
        type: 'code',
        caption: 'Currency parsing lives in one place',
        text: `export function parseCurrency(text: string): number { … }`,
      },
      {
        type: 'p',
        text: '`$17,050.00` has a symbol, a thousands separator and two decimals, and the application also renders signed amounts (`+$3,200.00`, `-$87.43`). Re-deriving that in nine specs is nine chances to get it subtly wrong, and it throws on unparseable text rather than silently returning `NaN`.',
      },
      {
        type: 'p',
        text: 'The recent-activity widget is modelled as a **Table**, so row access, column lookup and sorting come from the component rather than from ad-hoc locators in each test.',
      },
    ],
    changeWhen: ['A stat card is added.', 'A quick action is added.'],
    changeHow: [
      {
        text: 'Add the slug to `QuickAction`; `quickAction()` and `useQuickAction()` then work unchanged.',
      },
    ],
    why: 'The dashboard is where two independently rendered views of the same data meet, which is why its most valuable test compares its total against the accounts page rather than against a constant.',
    related: ['tests/ui/dashboard.spec.ts', 'src/pages/bank/accounts.page.ts'],
  },

  'src/pages/bank/accounts.page.ts': {
    group: 'pages',
    purpose: 'The account list and the add/edit dialog it opens.',
    blocks: [
      {
        type: 'p',
        text: 'One component models **both** the add and edit dialogs, because the application reuses the same form and changes only the container test id and the title. Two nearly identical members would have to be kept in step for no benefit.',
      },
      { type: 'h3', text: 'Every field in the dialog is required' },
      {
        type: 'p',
        text: 'Established by submitting an incomplete form and reading what came back — first "Please select an account type", then "Please enter a valid starting balance". A page object that filled only the name failed with a dialog that never closed, and the cause was not obvious.',
      },
      {
        type: 'warn',
        text: 'The starting-balance field carries **no `data-testid`** — only a generated id (`base-ui-_r_a_`) that changes between renders and must never be selected on. It is located by placeholder, scoped to the dialog: a placeholder is user-visible text, which makes it a more meaningful anchor than a generated id.',
      },
      {
        type: 'p',
        text: 'The terms checkbox is a `span[role="checkbox"]`, not a native input. The Checkbox component already handles that — `check()` falls back to a click when Playwright\'s strict `check()` refuses a non-input element.',
      },
    ],
    changeWhen: ['The account form gains a field.'],
    changeHow: [
      {
        text: 'Add the component and fill it in `addAccount()`. Check whether it is required by submitting without it.',
      },
    ],
    why: "Discovering required fields by reading the application's own validation messages is faster and more reliable than reading its markup.",
    related: ['tests/ui/accounts.spec.ts', 'src/pages/bank/account-detail.page.ts'],
  },

  'src/pages/bank/account-detail.page.ts': {
    group: 'pages',
    purpose: 'A single account: its balance and a filterable, sortable transaction table.',
    blocks: [
      {
        type: 'note',
        text: 'Its URL carries an account id, so `goto()` is not used — the page is reached by clicking through from the accounts list, which is how a user reaches it and therefore what should be tested.',
      },
    ],
    changeWhen: ['The detail page gains a filter.'],
    changeHow: [{ text: 'Add the component and a method that waits for the list to settle.' }],
    why: 'The detail balance and the list balance are two renderings of one number — the place a stale cache shows up, and the reason this page object exists rather than being folded into the list.',
    related: ['src/pages/bank/accounts.page.ts', 'tests/ui/accounts.spec.ts'],
  },

  'src/pages/bank/transfer.page.ts': {
    group: 'pages',
    purpose:
      'Internal transfers. Models all **three** screens of the flow: the form, the confirmation modal and the success page.',
    blocks: [
      {
        type: 'rule',
        text: 'A test that stops at "the form submitted" has not tested a transfer. Modelling all three screens is what lets a test assert the reference number, the confirmed amounts and the resulting balances.',
      },
      {
        type: 'code',
        caption: 'The happy path returns the one thing a caller cannot get otherwise',
        text: `async completeTransfer(input: { from: string; to: string; amount: string }): Promise<string> {
  await this.fillForm(input);
  await this.review();
  await this.confirmDialog.waitForOpen();
  await this.confirmButton.click();
  await this.successHeading.waitForVisible();
  return (await this.referenceId.getText()).trim();
}`,
      },
      {
        type: 'warn',
        text: '`to` must be filled **after** `from`: the application removes the selected source from the destination list, so the other order picks an option that is about to disappear.',
      },
      {
        type: 'p',
        text: 'That removal is also how the application prevents a same-account transfer — structurally, rather than by validating afterwards. The test asserts the mechanism the app actually uses rather than forcing an invalid selection to produce a message that never appears.',
      },
    ],
    changeWhen: ['The flow gains a step.', 'The form gains a field.'],
    changeHow: [
      {
        text: 'Add the components under the step they belong to; the three comment banners keep the file navigable.',
      },
    ],
    why: 'Money movement is the one action that has to be right in three separate places — validation, confirmation and the resulting balances — and only a page object that models all three lets a test check all three.',
    related: ['tests/ui/transfer.spec.ts', 'src/pages/bank/dropdown-panel.ts'],
  },

  'src/pages/bank/send-money.page.ts': {
    group: 'pages',
    purpose: 'External payments to a saved payee, and the add-payee dialog.',
    blocks: [
      {
        type: 'p',
        text: '`isBlocked()` reports whether money movement is disabled, which is how the frozen-persona tests assert the block without duplicating the selector.',
      },
    ],
    changeWhen: ['The payee form changes.'],
    changeHow: [{ text: 'Update the dialog components and `addPayee()`.' }],
    why: 'Saving a payee only matters if it appears next time — which is why the page object exposes the payee dropdown rather than just the dialog.',
    related: ['tests/ui/money-movement.spec.ts'],
  },

  'src/pages/bank/bill-pay.page.ts': {
    group: 'pages',
    purpose: 'Bill payment: a biller search, an amount, a date and a memo.',
    blocks: [
      { type: 'h3', text: 'Two component choices worth explaining' },
      {
        type: 'p',
        text: 'The biller field is an **Autocomplete**, not a Dropdown: typing filters a list. The payment date is modelled as a **TextInput**, not a DatePicker — the DatePicker component drives a *custom* calendar by clicking through months, which this control does not have. A native date input is set by writing its `yyyy-mm-dd` value, and TextInput is the component that does that.',
      },
      {
        type: 'rule',
        text: 'Using the fancier component because of its name would be reaching for the wrong tool. Match the component to the markup, not to the label on the field.',
      },
      {
        type: 'warn',
        text: 'The add-biller dialog has a second required field — the account/reference number — with **no test id and no associated `<label>`**, verified against the running application. It is located by placeholder, which is the only user-visible anchor available. The accessibility suite records the underlying labelling gap.',
      },
    ],
    changeWhen: ['The biller dialog changes.'],
    changeHow: [
      {
        text: 'Update the components. Confirm which fields are required by submitting without them.',
      },
    ],
    why: 'A dialog that never closes is the symptom of an unfilled required field, and it is worth writing down which they are so the next person does not rediscover it.',
    related: ['tests/ui/money-movement.spec.ts'],
  },

  'src/pages/bank/transactions.page.ts': {
    group: 'pages',
    purpose:
      'All activity across every account: search, account filter, type filter, three sortable columns, pagination and CSV export. The page that exercises the most of the component library.',
    blocks: [
      {
        type: 'code',
        caption: 'A parser with a trap in it',
        text: `async paginationState(): Promise<{ from: number; to: number; total: number }> {
  const text = await this.paginationInfo.getText();
  const match = /(\\d+)\\s*[–-]\\s*(\\d+)\\s+of\\s+(\\d+)/.exec(text);
  …
}`,
      },
      {
        type: 'warn',
        text: 'The dash in "Showing 1–10 of 18" is an **en dash**, not a hyphen. Matching only on `-` silently returns nothing — the sort of thing that costs an afternoon, which is why the character class contains both.',
      },
      {
        type: 'p',
        text: 'The type filter is a segmented `div[role="group"]` of buttons rather than native radios, so tests drive it by clicking the visible option.',
      },
    ],
    changeWhen: ['A filter or column is added.'],
    changeHow: [
      {
        text: 'Add the component and a method that waits for the table to settle after the interaction.',
      },
    ],
    why: 'Pagination, sorting and filtering are where a table stops being a list and starts being a feature, and each needs its own accessor rather than a locator in every test.',
    related: ['tests/ui/transactions.spec.ts'],
  },

  'src/pages/bank/apply-loan.page.ts': {
    group: 'pages',
    purpose:
      "Loan applications and their history — including the page that carries the application's planted defect.",
    blocks: [
      { type: 'h3', text: 'Why `allHistoryRows()` walks the pages' },
      {
        type: 'p',
        text: 'The history paginates at five rows, and the total beneath it is labelled **"Total (Active/Pending)"** — it covers all loans but counts only the ones that are not closed. Comparing the total against the visible page is therefore wrong twice over: it misses later pages and it includes closed loans.',
      },
      {
        type: 'note',
        text: 'An earlier version of the loan test did exactly that and reported a mismatch for a perfectly healthy account. Walking the pages and filtering by status is what makes the comparison mean anything — and it is what allows the planted defect to be demonstrated credibly.',
      },
      {
        type: 'code',
        text: `async expectedActiveTotal(): Promise<number> {
  const rows = await this.allHistoryRows();
  return rows.filter((row) => !/closed/i.test(row.status))
             .reduce((sum, row) => sum + row.amount, 0);
}`,
      },
    ],
    changeWhen: ['The loan form changes.', 'The history gains a column.'],
    changeHow: [
      {
        text: "Update the components. If the total's definition changes, `expectedActiveTotal()` is the one place to change.",
      },
    ],
    why: "The defect this page carries is the suite's most valuable result, and it is only credible because the comparison it rests on is provably correct for a healthy account.",
    gotchas: [
      '`resetData()` is for a human debugging in headed mode. Tests never need it — a fresh context already reseeds.',
    ],
    related: ['tests/ui/apply-loan.spec.ts'],
  },

  'src/pages/bank/notifications.page.ts': {
    group: 'pages',
    purpose: 'The notification centre and the unread badges it drives.',
    blocks: [
      {
        type: 'warn',
        text: 'The unread count element is **removed from the DOM** once everything is read. A test that waited for it to say "0" would hang until its timeout — which is exactly why absence deserves a method (`unreadCount()`) rather than an inline locator in each test.',
      },
    ],
    changeWhen: ['The notification list changes.'],
    changeHow: [{ text: 'Update the list component and its item selector.' }],
    why: 'The badge and the page are two renderings of one number; the page object exposes both so a test can assert they agree.',
    related: ['tests/ui/account-settings.spec.ts', 'src/pages/bank/bank-shell.ts'],
  },

  'src/pages/bank/profile.page.ts': {
    group: 'pages',
    purpose: 'Profile, password change and security settings.',
    blocks: [
      {
        type: 'note',
        text: 'The edit affordance is **not a dialog** — it replaces the read-only display with an inline form. Every other "edit" in the application opens a modal, so a page object written from that pattern would wait for one that never appears. Checked against the running application rather than assumed.',
      },
      {
        type: 'p',
        text: 'Two-factor is a `button[role="switch"]` with `aria-checked` — the ARIA switch pattern, which the Toggle component reads directly.',
      },
    ],
    changeWhen: ['The profile form changes.'],
    changeHow: [
      { text: 'Update the display and edit-form components together; they mirror each other.' },
    ],
    why: 'The inline-edit surprise is the reason this page object is worth reading before writing a test against it.',
    related: ['tests/ui/account-settings.spec.ts'],
  },

  'src/pages/bank/index.ts': {
    group: 'pages',
    purpose: 'Barrel for the SecureBank page objects.',
    changeWhen: ['You add a page object.'],
    changeHow: [{ text: 'Export it here and construct it in the `bank` fixture.' }],
    why: 'One import path, and one place to see every page the suite drives.',
    related: ['src/fixtures/bank.fixture.ts'],
  },
};
