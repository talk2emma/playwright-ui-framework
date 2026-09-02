/** Long-form documentation pages. */

export const overview = [
  {
    type: 'p',
    text: 'This is the complete reference for the **playwright-ui-framework**: what every folder and file does, how the layers fit together, and — for any change you might need to make — where to go, what to do and why that is the right place for it.',
  },
  {
    type: 'p',
    text: 'The framework is a TypeScript foundation for testing every kind of user-interface element: forms, tables and enterprise data grids, dropdowns, date pickers, modals, toasts, tabs, trees, carousels, canvases, iframes, shadow DOM, rich-text editors, drag-and-drop, infinite scroll and charts.',
  },

  { type: 'h2', text: 'How to use this document' },
  {
    type: 'table',
    head: ['If you want to…', 'Go to'],
    rows: [
      [
        'See the framework actually working',
        '**Worked example** — the suite against a real bank, and the defects it found',
      ],
      ['Understand the design before touching anything', '**Architecture**'],
      ['Find what a specific file does', '**Project structure**, then the matching reference page'],
      ['Make a change and not sure where', '**Playbooks** — task-oriented runbooks'],
      ['Know the rules before opening a pull request', '**Conventions**'],
      ['Diagnose a failure or a flaky test', '**Troubleshooting**'],
      ['Look up a class, method or type', '**API index**'],
    ],
  },

  { type: 'h2', text: 'Quick start' },
  {
    type: 'code',
    caption: 'From clone to first run',
    text: `npm ci                                # install dependencies
npx playwright install --with-deps    # install browsers

npm test                              # 110 tests against a real application
npm run validate                      # typecheck + lint + format check`,
  },
  {
    type: 'note',
    text: 'No configuration is required. The suite ships pointed at **SecureBank** — a real banking application published at qaplayground.com for automation practice — with its published demo credentials, so a fresh clone produces a meaningful result immediately. Copy `.env.example` to `.env` when you point it at your own application.',
  },
  {
    type: 'p',
    text: "It ships with **110 working tests**: the application's own catalogue of 42 test cases, plus authentication, navigation, responsive behaviour, accessibility scans and visual baselines. Three of them record real defects the suite found.",
  },
  {
    type: 'note',
    text: 'Requires Node 20, 22 or 24 (LTS); the version is pinned in `.nvmrc`. Playwright supports LTS releases, and odd-numbered Node versions regularly break module resolution in tooling.',
  },

  { type: 'h2', text: 'The three things to know first' },
  {
    type: 'ol',
    items: [
      '**Tests import from `@fixtures/index`, never from `@playwright/test`.** That one import is what gives a spec the logger, component factory, network control, console capture, generated data and custom matchers.',
      '**Selectors live in components, components are wired up in page objects, and tests call page-object methods.** A selector in a spec is a defect waiting to happen.',
      '**`src/config/env.config.ts` is the only file that reads `process.env`.** Everything else receives validated, typed configuration.',
    ],
  },

  { type: 'h2', text: 'What a test will look like' },
  {
    type: 'code',
    caption: 'tests/ui/checkout/discount.spec.ts',
    text: `import { test, expect } from '@fixtures/index';
import { CheckoutPage } from '@pages/checkout.page';

test('applies a discount code @smoke', async ({ page, api }) => {
  const order = await api.post('/orders', { items: [{ sku: 'A1', qty: 2 }] });  // seed fast

  const checkout = new CheckoutPage(page);
  await checkout.goto({ query: { order: order.id } });

  const message = await checkout.applyDiscount('SAVE20');

  expect(message).toContain('Discount applied');
  await checkout.total.expectText('$80.00');
  expect(await checkout.items.getColumnValues('Price')).toBeSorted('desc');
});`,
  },

  { type: 'h2', text: 'Regenerating this documentation' },
  {
    type: 'code',
    caption: 'One command rebuilds everything',
    text: `npm run docs        # extract API + build HTML site + render PDF
npm run docs:api    # refresh docs/generated/api.json only
npm run docs:html   # rebuild docs/site/ only
npm run docs:pdf    # re-render the PDF only`,
  },
  {
    type: 'note',
    text: 'The build **fails** if a file in the repository has no documentation entry. That is deliberate: it is the mechanism that stops this document falling behind the code.',
  },
];

export const architecture = [
  {
    type: 'p',
    text: 'The framework is five layers, and each layer may only reach downwards. A component never knows which page it is on; a page never knows which test is running.',
  },
  {
    type: 'tree',
    text: `tests/          What the business cares about. No selectors, no waits.
   |  calls
src/pages/      Page objects: URL, ready state, business actions.
   |  composed of
src/components/ Element behaviour: how a table sorts, how a dropdown opens.
   |  built on
src/core/       BaseComponent / BasePage: logging, steps, waits, diagnostics.
   |  uses
src/utils/      Cross-cutting: logging, network, files, a11y, visual, data.
src/config/     Validated environment configuration.`,
  },

  { type: 'h2', text: 'Why there is a component layer at all' },
  {
    type: 'p',
    text: 'Most Playwright suites put selectors in page objects and call raw locator methods from there. That works until the twentieth table — at which point every page object contains its own slightly different "read all rows" loop, and a change in the grid library means editing twenty files.',
  },
  {
    type: 'p',
    text: 'Here, `Table` knows how to read rows by column name, sort, filter, select and verify ordering — once. `DataGrid` extends it with the three things virtualised grids add: asynchronous loading, rows that exist only while scrolled into view, and inline editing. A page object then becomes a short, declarative list of components.',
  },
  {
    type: 'code',
    caption: 'A page object is a declaration, not a procedure',
    text: `readonly results   = this.factory.dataGrid('[data-testid="results"]', { name: 'Results' });
readonly filters   = this.factory.form('[data-testid="filters"]', { name: 'Filters' });
readonly pagination = this.factory.pagination('[data-testid="pager"]', { name: 'Pager' });`,
  },

  { type: 'h2', text: 'BaseComponent: what every element gets for free' },
  {
    type: 'p',
    text: 'Because all 37 component types extend one class, these behaviours are uniform and cost nothing to add to a new component:',
  },
  {
    type: 'ul',
    items: [
      '**Reported steps** — every action runs inside `test.step`, so a trace reads `Table "Results": sort by "Amount" desc` rather than an anonymous click.',
      '**Contextual failures** — errors name the component, the selector and the original cause.',
      '**Pre-action hygiene** — visibility wait, scroll into view, optional stability wait, before every interaction.',
      '**State inspection** — `getState()` returns visibility, enablement, checked state, focus, text, value, box and every attribute in one call.',
      '**Named assertions** — web-first assertions wrapped with messages that identify the component.',
    ],
  },
  {
    type: 'note',
    text: 'This is the leverage point of the framework: one method added here becomes available to every element type, and one improvement to error messages improves every failure in the suite.',
  },

  { type: 'h2', text: 'How a run actually executes' },
  {
    type: 'steps',
    items: [
      {
        text: '`playwright.config.ts` is loaded in the parent process. Importing it triggers `env.config.ts`, which loads the `.env` files and validates every variable with zod. A bad variable fails here, before a browser exists.',
      },
      {
        text: '`globalSetup` creates the artifact directories, clears the previous HTML report and logs the resolved configuration.',
      },
      {
        text: 'The `setup` project runs `auth.setup.ts`, signing in once per role and writing `storage/<role>.json`.',
      },
      {
        text: 'Worker processes start. Each worker builds worker-scoped fixtures once — notably the `api` client.',
      },
      {
        text: 'For each test, Playwright builds the test-scoped fixtures: browser context (with storage state), page, `ui`, `log`, `network`, `consoleErrors`, `testData`.',
      },
      {
        text: 'The test body runs. Component actions log, report steps and take screenshots on failure.',
      },
      {
        text: 'Teardown runs in reverse order. If the test failed, the `page` fixture attaches the URL, a DOM snapshot and captured browser errors.',
      },
      {
        text: 'Reporters write the HTML report, JUnit XML, JSON, CTRF and `reports/summary.json`. `globalTeardown` removes scratch files and logs the duration.',
      },
    ],
  },

  { type: 'h2', text: 'Locator resolution' },
  {
    type: 'p',
    text: '`resolveLocator()` accepts a CSS or XPath string, an existing Locator, or a function that derives one from a scope — and applies the iframe and shadow-DOM options a component declares. That is why an iframe needs no special handling anywhere else:',
  },
  {
    type: 'code',
    caption: 'The same component API, inside a frame',
    text: `const frame = new Frame(page, '#payment');
const cardNumber = new TextInput(frame.locator, '#card-number');`,
  },

  { type: 'h2', text: 'Design decisions and their rationale' },
  {
    type: 'table',
    head: ['Decision', 'Rationale', 'What it would cost to reverse'],
    rows: [
      [
        'A component layer between pages and locators',
        'Element behaviour is written once instead of per page.',
        'High — every page object would absorb the logic.',
      ],
      [
        '`test.step` around every action',
        'Traces read as prose; failures point at a business step.',
        'Low, but debugging gets materially worse.',
      ],
      [
        'zod validation of the environment',
        'Misconfiguration fails in one second with a precise message.',
        'Low, but silent misconfiguration returns.',
      ],
      [
        'Storage-state authentication',
        'Removes a login from every test.',
        'Medium — suite time grows by minutes per hundred tests.',
      ],
      [
        'Test data seeded from the test title',
        'Retries reproduce the original inputs.',
        'Low, but retries stop being diagnostic.',
      ],
      [
        'Named timeout budgets',
        'Flakiness is tuned in one file.',
        'Medium — magic numbers spread quickly.',
      ],
      ['Dependency-free logger', 'Logging libraries break across Node releases.', 'Low.'],
      [
        'Three drag-and-drop strategies',
        'No single approach works across DnD libraries.',
        'High — discovered mid-sprint at the worst time.',
      ],
    ],
  },

  { type: 'h2', text: 'Deliberate constraints' },
  {
    type: 'rule',
    text: 'No `waitForTimeout` in test code. No selectors above the component layer. No `process.env` outside `env.config.ts`. No business assertions inside page objects. No hand-maintained data rows that parallel workers can collide on.',
  },
];

/* ------------------------------------------------------------------ */

export const workedExample = [
  {
    type: 'p',
    text: 'The framework drives **SecureBank**, a real banking application published at [qaplayground.com/bank](https://qaplayground.com/bank/login) for automation practice. Nothing is mocked. This page explains how the suite is built against it, what the code does, and the three defects it found.',
  },
  {
    type: 'p',
    text: 'If you read one page of this document, read this one. Everything else is reference; this is the framework doing its job.',
  },

  { type: 'h2', text: 'Why this application' },
  {
    type: 'table',
    head: ['Property', 'Why it matters'],
    rows: [
      [
        '**Thorough `data-testid` coverage**',
        "Almost every meaningful element carries one, which is why `testIdAttribute: 'data-testid'` does so much work here. The handful that do not are the interesting cases — see below.",
      ],
      [
        '**State lives in `localStorage`**',
        'Playwright gives every test a fresh browser context, so each test starts from the seeded dataset automatically. No cleanup, no shared account, no ordering constraints — the suite is fully parallel by construction.',
      ],
      [
        '**Seven personas with different behaviour**',
        'A locked account, a frozen account, an overdraft, a slow loader and one carrying a planted defect. Negative paths are reachable by logging in as somebody else rather than by mocking a failure.',
      ],
      [
        '**It publishes its own test catalogue**',
        "The app lists 42 intended test cases at `/bank/test-cases`. The suite implements them and each test names the case it satisfies, so coverage is checkable against the app's own specification.",
      ],
    ],
  },
  {
    type: 'rule',
    text: 'The third property is the one worth stealing. Most UI suites test the happy path because the unhappy paths need a backend nobody controls. Here they are one login away.',
  },

  { type: 'h2', text: 'How a test is put together' },
  {
    type: 'code',
    caption: 'tests/ui/transfer.spec.ts — the whole shape',
    text: "import { test, expect } from '../../src/fixtures';\n\ntest('TC-XFER-004 — a valid transfer completes and issues a reference @smoke', async ({ signedIn }) => {\n  await signedIn.transfer.goto();\n\n  const reference = await signedIn.transfer.completeTransfer({\n    from: 'Everyday Checking',\n    to: 'High-Yield Savings',\n    amount: '25.50',\n  });\n\n  expect(reference).toMatch(/TXN-\\d{8}-\\d+/);\n  await expect(signedIn.transfer.confirmedAmount.locator).toContainText('25.50');\n});",
  },
  {
    type: 'table',
    head: ['Piece', 'What it does', 'Why not the obvious alternative'],
    rows: [
      [
        "`from '../../src/fixtures'`",
        "Gets the framework's `test` and `expect`",
        'Importing `@playwright/test` gives you neither the page objects nor the custom matchers, and nothing warns you',
      ],
      [
        '`{ signedIn }`',
        'Signs in as the standard persona and hands over every page object',
        'A `beforeEach` would also run for the login specs, which must start signed out',
      ],
      [
        '`completeTransfer(...)`',
        'Drives all three screens — form, confirmation modal, success page',
        'A test stopping at "the form submitted" has not tested a transfer',
      ],
      [
        '`SEED`',
        'Dataset facts in one file',
        'Nine specs hard-coding $17,050 is nine edits when the app reseeds',
      ],
    ],
  },

  { type: 'h2', text: 'Three layers, and what belongs in each' },
  {
    type: 'tree',
    text: '  tests/ui/transfer.spec.ts          WHAT should be true — assertions only\n     |\n  src/pages/bank/transfer.page.ts   WHERE things are and HOW to drive them\n     |\n  src/components/form/dropdown.ts   HOW a *kind* of widget behaves, for any app',
  },
  {
    type: 'rule',
    text: 'A page object returns values and never asserts business outcomes. That is what lets a negative-path test reuse it instead of fighting it, and it is why `fillForm()` and `completeTransfer()` are separate methods.',
  },
  {
    type: 'p',
    text: 'The component layer is where the framework earns its keep. SecureBank\'s dropdowns are custom listboxes, its terms checkbox is a `span[role="checkbox"]`, its two-factor control is a `button[role="switch"]`. The `Dropdown`, `Checkbox` and `Toggle` components already handle all three — the page object only has to say where they are.',
  },

  { type: 'h2', text: 'The details that took a real run to discover' },
  {
    type: 'p',
    text: 'Every item below was found by running against the application, not by reading its markup. They are the reason exploring first and writing second is worth the time.',
  },

  { type: 'h3', text: '1. A closed dropdown leaves its panel in the DOM' },
  {
    type: 'code',
    caption: 'src/pages/bank/dropdown-panel.ts',
    text: 'export const VISIBLE_LISTBOX = \'[role="listbox"]:visible\';',
  },
  {
    type: 'p',
    text: 'On the transfer page, once "From" has been used there are two `[role="listbox"]` elements — the closed one and the one being opened. A plain selector resolves to the first, which is hidden, and the component waits for it until it times out. The failure reads *"waiting for [role=listbox] to be visible"* while a perfectly good panel is open a few pixels away.',
  },

  { type: 'h3', text: '2. Reading state after the click instead of before' },
  {
    type: 'code',
    caption: 'The bug, and the fix',
    text: '// Broken: reads the ALREADY-CHANGED value, so the condition can never hold.\nawait this.themeToggle.click();\nawait this.page.waitForFunction((wasDark) => isDark() !== wasDark, await this.isDarkMode());\n\n// Correct:\nconst wasDark = await this.isDarkMode();\nawait this.themeToggle.click();\nawait this.page.waitForFunction((previous) => isDark() !== previous, wasDark);',
  },
  {
    type: 'p',
    text: 'Cheap mistake, expensive symptom: it looked exactly like the application failing to switch theme.',
  },

  { type: 'h3', text: '3. Absence is a state' },
  {
    type: 'p',
    text: 'The unread-notification badge is **removed from the DOM** at zero rather than showing "0". A test waiting for the text "0" hangs until its timeout. `unreadCount()` reads absence as zero, so no test has to know.',
  },

  { type: 'h3', text: '4. `sr-only` is visible to Playwright' },
  {
    type: 'p',
    text: 'The skip link is clipped to a 1x1 box rather than hidden, because a `display: none` element cannot be focused. Playwright therefore reports it as *visible* and `toBeHidden()` fails for the wrong reason. The correct assertion is about the **bounding box**, which is what actually distinguishes "clipped" from "on screen".',
  },

  { type: 'h3', text: '5. Sorting applies to the dataset, not the page' },
  {
    type: 'p',
    text: 'An early draft asserted that clicking sort twice produced the reverse of the first page. It failed against entirely correct behaviour: sorting covers all 18 transactions while 10 are shown, so descending page 1 holds the largest ten and ascending page 1 the smallest — two different slices. Comparing the *directions* is the assertion that actually catches a broken sort control.',
  },

  { type: 'h3', text: '6. Read seed values from a clean context' },
  {
    type: 'p',
    text: '`totalTransactions` was first recorded as 20, from a session that had already performed a transfer — each transfer adds a debit and a matching credit. The true figure is 18. Seed values read from an exploratory session encode whatever the explorer happened to do first.',
  },

  { type: 'h3', text: "7. Discover required fields from the app's own messages" },
  {
    type: 'p',
    text: 'The add-account dialog looked like it needed a name. Submitting it produced "Please select an account type", then "Please enter a valid starting balance" — and the balance field has no test id at all. Reading the validation messages was faster and more reliable than reading the markup.',
  },

  { type: 'h2', text: 'Three defects the suite found' },
  {
    type: 'p',
    text: 'All three are in the application, verified by hand, and none of them fails the build. They are recorded with `test.fail()`, which is the right tool for a defect you do not control:',
  },
  {
    type: 'ul',
    items: [
      'The expectation stays in the suite, written as it **should** behave.',
      'The run stays green, so nobody learns to ignore a permanently red test.',
      'The moment somebody fixes it, the test **fails** — telling us to remove the annotation.',
    ],
  },
  {
    type: 'p',
    text: 'A skipped test would go quiet forever; a deleted one would lose the finding entirely.',
  },
  {
    type: 'table',
    head: ['Finding', 'Standard', 'Detail'],
    rows: [
      [
        'The skip link is unreachable by keyboard',
        'WCAG 2.4.1',
        'Correct markup, first in the DOM, works when focused — but the first Tab lands on the brand link, so a keyboard user can never reach it',
      ],
      [
        'The account dialog omits `aria-modal`',
        'WAI-ARIA',
        '`role="dialog"` and a label are present; without `aria-modal="true"` a screen reader is not told to confine the user to the dialog',
      ],
      [
        'Three transfer controls have no accessible name',
        'WCAG 4.1.2',
        'The memo field and both date-type radios announce as "blank". axe does not flag them — precisely the class an automated scan misses',
      ],
    ],
  },
  {
    type: 'note',
    text: 'Two further violations — `color-contrast` on four pages and `aria-prohibited-attr` on one — are **baselined** rather than annotated, because they recur across pages. They are excluded from the gating scans, so any *new* violation fails the build, and a never-failing test reports the backlog on every run.',
  },

  { type: 'h2', text: 'And the planted one' },
  {
    type: 'p',
    text: 'The application ships a deliberate bug for `error_user`, and its own catalogue asks for it to be reproduced (TC-LOAN-004). This is the test that proves the framework can **find** something rather than confirm things work.',
  },
  {
    type: 'code',
    caption: 'tests/ui/apply-loan.spec.ts',
    text: 'const displayed = await bank.applyLoan.displayedTotal();\nconst expected = await bank.applyLoan.expectedActiveTotal();\n\nexpect(displayed).toBeCloseTo(expected, 2);',
  },
  {
    type: 'table',
    head: ['Persona', 'Displayed total', 'Active + pending loans', 'Verdict'],
    rows: [
      ['`standard_user`', '$39,300', '$39,300', 'Correct'],
      ['`error_user`', '$24,300', '$39,300', '**Short by the $15,000 newest pending loan**'],
    ],
  },
  {
    type: 'rule',
    text: 'A control test asserts the same comparison passes for the healthy account. Without it, a failing total could just as easily mean the assertion is wrong — the control is what makes the result trustworthy.',
  },
  {
    type: 'p',
    text: 'Getting that comparison right took two attempts. The total is labelled "Total (Active/Pending)" and the history paginates at five rows, so comparing it against the visible page is wrong twice over: it misses later pages and includes closed loans. `expectedActiveTotal()` walks the pages and filters by status.',
  },

  { type: 'h2', text: 'What the suite covers' },
  {
    type: 'table',
    head: ['Spec', 'Tests', 'Covers'],
    rows: [
      [
        '`login.spec.ts`',
        '11',
        'Sign-in, refusal messages, password visibility, remember-me, the fixture-integrity check',
      ],
      ['`dashboard.spec.ts`', '8', 'TC-DASH-001..006, stat cards, every quick action'],
      [
        '`navigation.spec.ts`',
        '15',
        'Ten destinations, brand link, unread badge, responsive drawer, the skip link',
      ],
      [
        '`accounts.spec.ts`',
        '12',
        'TC-ACC-001..006 across three personas, the dialog, the detail page',
      ],
      ['`transfer.spec.ts`', '12', 'TC-XFER-001..006, cancellation, the frozen block'],
      ['`transactions.spec.ts`', '11', 'TC-TXN-001..006, the type filter, the CSV export'],
      ['`money-movement.spec.ts`', '11', 'TC-SEND-001..006 and TC-BILL-001..006'],
      ['`apply-loan.spec.ts`', '9', 'TC-LOAN-001..006 including the planted defect'],
      ['`account-settings.spec.ts`', '11', 'Notifications and profile'],
      ['`bank.a11y.spec.ts`', '15', 'axe across ten pages and both themes'],
      [
        '`bank.visual.spec.ts`',
        '7',
        'Login, stat cards, sidebar in both themes, transfer form, empty state',
      ],
    ],
  },
  {
    type: 'p',
    text: '**110 tests, all passing.** Three of them are documented defects recorded as expected failures.',
  },

  { type: 'h2', text: 'Pointing this at your own application' },
  {
    type: 'steps',
    items: [
      {
        text: 'Add your environment to `src/config/environments.ts` — URLs and behaviour flags only, no secrets.',
      },
      {
        text: '**Explore before writing.** Open the app, dump its test ids, click the widgets. Every item in the section above came from doing that, and each would have cost more to discover through a failing test.',
      },
      {
        text: 'Model shared chrome as a component, not a page object, the way `BankShell` is. It has no URL and appears everywhere.',
      },
      {
        text: 'Write a page object per page. Declare components as readonly fields; write methods that read as business actions.',
      },
      {
        text: 'Add them to the fixture so every spec can reach them without constructing anything.',
      },
      {
        text: 'Put dataset facts in one file, read from a **clean** session, and add a test that cross-checks them against the application.',
      },
      {
        text: 'Record defects you do not control with `test.fail()`, and baseline recurring accessibility violations. Both keep the suite green and the findings visible.',
      },
    ],
  },
];

export const playbooks = [
  {
    type: 'p',
    text: 'Task-oriented runbooks. Each answers the same three questions: **where** to go, **what** to do, and **why** the change belongs there rather than somewhere else.',
  },

  { type: 'h2', text: '1. Point the framework at a real application' },
  {
    type: 'steps',
    items: [
      {
        text: '**Where:** `src/config/environments.ts`. Set the real URLs for each environment.',
        code: `dev: {
  name: 'dev',
  baseURL: 'https://dev.yourapp.com',
  apiBaseURL: 'https://dev.yourapp.com/api',
  retries: 1,
  workers: undefined,
  ignoreHTTPSErrors: true,
},`,
      },
      {
        text: '**Where:** `.env`. Set `TEST_ENV` and the credentials for each role.',
        code: `TEST_ENV=dev
STANDARD_USER=qa.standard@yourapp.com
STANDARD_PASSWORD=...`,
      },
      {
        text: '**Where:** `src/hooks/auth.setup.ts`. Replace the placeholder selectors in `signIn` with your login page’s. This is the only file in the framework that must know your markup.',
      },
      {
        text: '**Verify:** run the setup project alone before anything else.',
        code: `npx playwright test --project=setup`,
      },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** URLs are non-secret configuration and belong in version control; credentials are secrets and belong in the environment; the login flow is application-specific and is deliberately isolated to one function so nothing else in the framework depends on your markup.',
  },

  { type: 'h2', text: '2. Add a page object for a new screen' },
  {
    type: 'steps',
    items: [
      { text: '**Where:** add `src/pages/<feature>.page.ts`, modelled on an existing page such as `src/pages/bank/transfer.page.ts`.' },
      {
        text: '**What:** set `path` and `readyIndicator`, declare components as readonly fields, and write business actions.',
        code: `export class InvoicesPage extends BasePage {
  protected readonly path = '/invoices';
  protected readonly readyIndicator: SelectorLike = '[data-testid="invoices-root"]';

  private readonly factory = ui(this.page);
  readonly grid   = this.factory.dataGrid('[data-testid="invoice-grid"]', { name: 'Invoices' });
  readonly search = this.factory.input('[data-testid="search"]', { name: 'Search' });

  async searchFor(term: string): Promise<void> {
    await this.search.typeAndSettle(term);
    await this.grid.waitForData();
  }
}`,
      },
      { text: '**Where:** add it to the `pages` fixture in `src/fixtures/bank.fixture.ts` so specs can reach it.' },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** the ready indicator is what makes navigation deterministic; declaring components as fields means a selector change is one line and editor autocomplete lists the whole page surface.',
  },

  { type: 'h2', text: '3. The component library does not cover my widget' },
  {
    type: 'steps',
    items: [
      {
        text: '**First:** check whether an existing component only needs configuration. Most do — `Dropdown`, `DataGrid`, `DatePicker`, `Autocomplete` and the rest take their selectors as options.',
        code: `ui.dropdown('#country', { panelSelector: '.MuiAutocomplete-popper', optionSelector: '.MuiAutocomplete-option' });`,
      },
      {
        text: '**Then:** if the behaviour differs, subclass and override only the method that differs.',
        code: `class HoverDropdown extends Dropdown {
  override async open(): Promise<void> { /* hover instead of click */ }
}`,
      },
      {
        text: '**Otherwise:** create a new component under the right group in `src/components/`, extending `BaseComponent`.',
        code: `export class Timeline extends BaseComponent {
  protected override get componentType(): string { return 'Timeline'; }

  async getEvents(): Promise<string[]> {
    return this.step('read events', async () => {
      return (await this.locator.locator('.event').allInnerTexts()).map((t) => t.trim());
    });
  }
}`,
      },
      {
        text: '**Then:** export it from `src/components/index.ts` and add a factory method in `component.factory.ts`.',
      },
      {
        text: '**Finally:** document it — add an entry to the matching module in `scripts/docs/content/` and run `npm run docs`.',
      },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** a widget behaviour written in a page object is invisible to every other page. Written as a component, it is available everywhere, reports itself in traces, and inherits all the base behaviour for free.',
  },

  { type: 'h2', text: '4. A test is flaky' },
  {
    type: 'steps',
    items: [
      {
        text: '**Diagnose first.** Open the trace from the HTML report; the failing step is named after the component and action.',
        code: `npm run report`,
      },
      {
        text: '**If the wait is wrong:** fix it in the component, not the test. Add a condition-based wait rather than a delay.',
      },
      {
        text: '**If the timeout is genuinely too short:** raise the named budget in `src/config/timeouts.ts` — never hard-code a number at the call site.',
      },
      {
        text: '**If the data collides:** use the `testData` fixture, which seeds faker per test, so parallel workers cannot share a record.',
      },
      {
        text: '**If a third party is unreliable:** stub it with the `network` fixture, or block it.',
        code: `await network.mock('**/api/recommendations', { body: [] });
await network.blockThirdParty();`,
      },
      {
        text: '**If the app is genuinely slow:** that is a product finding. Record it rather than hiding it behind a longer timeout.',
      },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** a wait added to a test fixes one test; a wait added to the component fixes every current and future use of that element. Retries in `playwright.config.ts` mask flakiness — they are a safety net, not a fix.',
  },

  { type: 'h2', text: '5. Add a new environment' },
  {
    type: 'steps',
    items: [
      {
        text: '**Where:** `src/types/index.ts` — add the name to `EnvironmentName`. TypeScript will now point at everything that must be updated.',
      },
      {
        text: '**Where:** `src/config/environments.ts` — add the entry with URLs, retries, workers and TLS policy.',
      },
      {
        text: '**Where:** `src/config/env.config.ts` — add the value to the `TEST_ENV` enum in the schema.',
      },
      {
        text: '**Where:** `.github/workflows/playwright.yml` — add it to the workflow_dispatch choice list.',
      },
      { text: '**Verify:**', code: `TEST_ENV=preprod npm run test:smoke` },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** the union type is the mechanism that turns "add an environment" from a search-and-hope exercise into a compiler-guided checklist.',
  },

  { type: 'h2', text: '6. Add a configuration variable' },
  {
    type: 'steps',
    items: [
      {
        text: '**Where:** `src/config/env.config.ts` — add it to the zod schema with a fallback.',
        code: `MAX_UPLOAD_MB: numeric(25),`,
      },
      {
        text: '**What:** expose it on the exported `config` object in the shape callers should see.',
        code: `maxUploadMb: raw.MAX_UPLOAD_MB,`,
      },
      { text: '**Where:** `.env.example` — document it with a safe placeholder.' },
      { text: '**Where:** the CI workflow, if it must be set there.' },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** reading `process.env` at the point of use reintroduces exactly the failure mode this file exists to prevent — an unparsed string, a missing value, a suite silently pointed at the wrong host.',
  },

  { type: 'h2', text: '7. Add a browser, device or specialised suite' },
  {
    type: 'steps',
    items: [
      {
        text: '**Where:** `playwright.config.ts`, the `projects` array. Copy an existing entry.',
        code: `{
  name: 'galaxy-s23',
  use: { ...devices['Galaxy S9+'] },
  dependencies: ['setup'],
  testIgnore: ['**/visual/**', '**/a11y/**'],
},`,
      },
      {
        text: '**Where:** `.github/workflows/playwright.yml` — add it to the matrix if it should run in CI.',
      },
      { text: '**Where:** `package.json` — add a script if people will run it directly.' },
    ],
  },
  {
    type: 'p',
    text: "**Why here:** `dependencies: ['setup']` is what gives the new project authenticated sessions; without it its tests start signed out and fail in a way that looks like an application bug.",
  },

  { type: 'h2', text: '8. Seed test data instead of clicking through the UI' },
  {
    type: 'steps',
    items: [
      { text: '**Where:** the service or fixture that owns the call — the framework has no central route table, so a route lives with the code that uses it.' },
      {
        text: '**Where:** the test, or a fixture if several tests need it. A fixture also gives you automatic cleanup.',
        code: `order: async ({ api }, use) => {
  const order = await api.post<Order>(ENDPOINTS.orders.create, { items: [{ sku: 'A1', qty: 1 }] });
  await use(order);
  await api.delete(ENDPOINTS.orders.byId(order.id));
},`,
      },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** seeding over HTTP takes about 200 ms; the same setup through the UI takes 20 seconds and couples the test to screens it is not testing. When those screens break, the wrong test fails.',
  },

  { type: 'h2', text: '9. Add an assertion the whole team will reuse' },
  {
    type: 'steps',
    items: [
      { text: '**Where:** `src/fixtures/custom-matchers.ts`.' },
      {
        text: '**What:** return `pass` plus a `message` function covering both directions — the negated message is what makes a matcher pleasant to debug.',
      },
      {
        text: '**Alternative:** if the assertion is about one element type, put it on that component as `expectSomething()` instead.',
      },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** a named matcher produces a failure message that is diagnosable from a CI log alone, which `expect(true).toBe(false)` never is.',
  },

  { type: 'h2', text: '10. Change the reporting outputs' },
  {
    type: 'steps',
    items: [
      {
        text: '**Where:** `playwright.config.ts` — the `reporters` array, for adding or removing a reporter.',
      },
      {
        text: '**Where:** `src/reporters/summary.reporter.ts` — to add a field to `reports/summary.json` that a dashboard or PR comment needs.',
      },
      {
        text: '**Where:** `.github/workflows/playwright.yml` — to change what is uploaded or retained.',
      },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** `summary.json` is the machine-readable contract with CI. Extending it there keeps every consumer working; parsing the HTML report instead would break on the next Playwright upgrade.',
  },

  { type: 'h2', text: '11. Update visual baselines' },
  {
    type: 'steps',
    items: [
      {
        text: '**Confirm the change is intended.** Open the diff images in the HTML report first.',
      },
      {
        text: '**Regenerate**, ideally in the container so the images match CI.',
        code: `npm run test:visual:update
# or: docker compose run --rm ui-tests --project=visual --update-snapshots`,
      },
      { text: '**Review the images in the pull request** exactly as you would review code.' },
    ],
  },
  {
    type: 'p',
    text: '**Why here:** baselines are OS- and browser-specific. Regenerating on a laptop and running in CI produces diffs on every run, which is why the container exists.',
  },

  { type: 'h2', text: '12. Handle an iframe, a shadow root or a new tab' },
  {
    type: 'code',
    caption: 'All three, without special cases',
    text: `// iframe: a scope, not a component
const payment = new Frame(page, '#payment-iframe');
await payment.waitForLoaded();
const card = ui(payment.locator).input('#card-number');

// shadow DOM: open roots are pierced automatically
const picker = ui.shadowHost('my-date-picker');
await picker.clickInShadow('.today');   // only needed for closed roots

// new tab
const report = await ui.link('#open-report').clickAndGetNewTab();`,
  },
  {
    type: 'p',
    text: '**Why here:** treating a frame as a scope rather than a component is what keeps iframe support out of all 37 component classes.',
  },

  { type: 'h2', text: '13. Onboard a new engineer' },
  {
    type: 'ol',
    items: [
      'Read **Overview** and **Architecture** here (about twenty minutes).',
      'Run `npm ci && npx playwright install --with-deps`, then `npm run test:ui`.',
      'Read `src/core/base.component.ts` — it explains more about the framework than any other file.',
      'Read `src/pages/bank/transfer.page.ts`, then build a page object for one screen the same way.',
      'Write one `@smoke` test using only page-object methods.',
      'Read **Conventions** before opening the pull request.',
    ],
  },
];

export const conventions = [
  {
    type: 'rule',
    text: '**Record a defect you cannot fix with `test.fail()`, never with `test.skip()` or a deletion.** The expectation stays in the suite written as it should behave, the run stays green so nobody learns to ignore it, and the test turns red the moment somebody fixes the defect. A skipped test goes quiet forever; a deleted one loses the finding. Tag it `@known-issue`.',
  },
  {
    type: 'rule',
    text: '**Explore the application before writing a page object.** Dump its test ids, open its widgets, submit its forms incomplete and read the messages that come back. Every non-obvious detail in this suite — a listbox that stays in the DOM when closed, a badge that disappears at zero, three required fields where one was expected — was found that way, and each would have cost more to discover through a failing test.',
  },
  {
    type: 'rule',
    text: '**Baseline recurring accessibility violations; annotate one-off ones.** A permanently red a11y suite is one people stop reading, which loses every future violation too. Exclude the known rules by name so anything *new* fails the build, and report the backlog in a test that never fails. Shrink the list; never grow it.',
  },

  {
    type: 'p',
    text: 'Rules the framework enforces, the anti-patterns they prevent, and a review checklist.',
  },

  { type: 'h2', text: 'Hard rules' },
  {
    type: 'table',
    head: ['Rule', 'Why', 'Enforced by'],
    rows: [
      [
        'Import `test`/`expect` from `@fixtures/index`',
        'Otherwise the spec has no fixtures or matchers.',
        'Review',
      ],
      ['No selectors in specs', 'A selector change would touch every test that used it.', 'Review'],
      [
        'No `waitForTimeout` in tests',
        'Fixed sleeps are slow when short and flaky when long.',
        'Review',
      ],
      [
        'No `process.env` outside `env.config.ts`',
        'Unvalidated configuration fails silently and late.',
        'Review',
      ],
      [
        'No business assertions in page objects',
        'Tests must state their own expectations.',
        'Review',
      ],
      ['Every test carries a tag', 'CI slices the suite by tag.', 'Review'],
      [
        'Every page object declares a ready indicator',
        'Deterministic navigation.',
        'TypeScript (abstract member)',
      ],
      ['No floating promises', 'An un-awaited action produces a phantom pass.', 'ESLint (error)'],
      [
        'Explicit return types on exported functions',
        'Signatures stay stable and readable.',
        'ESLint (`--max-warnings=0`)',
      ],
      [
        'No `test.only` on a branch',
        'It would silently skip the entire suite in CI.',
        '`forbidOnly` in CI',
      ],
    ],
  },

  { type: 'h2', text: 'Naming' },
  {
    type: 'table',
    head: ['Thing', 'Convention', 'Example'],
    rows: [
      [
        'Spec file',
        '`<feature>.spec.ts` under `tests/ui/<area>/`',
        '`tests/ui/checkout/discount.spec.ts`',
      ],
      ['Page object', '`<Feature>Page` in `<feature>.page.ts`', '`CheckoutPage`'],
      ['Component', 'Noun naming the element type', '`DataGrid`, `RichTextEditor`'],
      ['Component options', '`<Component>Options`', '`DropdownOptions`'],
      ['Component instance', 'What a user would call it', '`applyPromoButton`, not `btn2`'],
      ['Test title', 'Behaviour plus tag', '`applies a discount code @smoke`'],
      ['Utility file', '`<area>.utils.ts`', '`network.utils.ts`'],
    ],
  },

  { type: 'h2', text: 'Tags' },
  {
    type: 'table',
    head: ['Tag', 'Meaning', 'Runs'],
    rows: [
      ['`@smoke`', 'Critical path; must always pass.', 'Every pull request'],
      ['`@regression`', 'Full functional coverage.', 'Nightly'],
      ['`@a11y`', 'Accessibility scan.', 'Accessibility job'],
      ['`@visual`', 'Screenshot comparison.', 'Visual job'],
      ['`@slow`', 'Known long-running.', 'Nightly'],
      ['`@flaky`', 'Quarantined, with a ticket.', 'Excluded from gating runs'],
    ],
  },

  { type: 'h2', text: 'Anti-patterns' },
  {
    type: 'table',
    head: ['Instead of…', 'Do this', 'Because'],
    rows: [
      [
        '`await page.waitForTimeout(3000)`',
        'A condition-based wait in the component',
        'Sleeps are slow when short and flaky when long.',
      ],
      [
        "`page.locator('#btn-4').click()` in a spec",
        'A page-object method',
        'The spec should read as behaviour.',
      ],
      [
        'A hard-coded user in a shared record',
        'the `testData` fixture',
        'Parallel workers collide.',
      ],
      [
        'Signing in through the UI in every test',
        'Storage state',
        'Minutes of wall-clock time per run.',
      ],
      [
        '`if (await x.isVisible()) { … }` branching',
        'Deterministic setup',
        'Conditional tests hide failures.',
      ],
      [
        'Raising a timeout to fix flakiness',
        'Fixing the wait',
        'The bug is still there, just slower.',
      ],
      [
        'A full-page screenshot for one component',
        '`compareElement`',
        'Full-page baselines fail for any reason.',
      ],
      [
        '`expect(await x.count()).toBe(3)`',
        '`await expect(x).toHaveCount(3)`',
        'Web-first assertions retry; plain ones do not.',
      ],
    ],
  },

  { type: 'h2', text: 'Pull-request checklist' },
  {
    type: 'ul',
    items: [
      '`npm run validate` passes (typecheck, lint with zero warnings, format).',
      'New element behaviour lives in a component, not a page object or a test.',
      'New selectors are configurable options, not hard-coded strings, when the component serves several UI libraries.',
      'Every new public method is wrapped in `this.step()` and has an explicit return type.',
      'New configuration is in the zod schema **and** in `.env.example`.',
      'New tests carry a tag and use no raw selectors.',
      'Test data is generated or API-seeded, never a shared fixed record.',
      'Documentation entry added for any new file, and `npm run docs` succeeds.',
    ],
  },
];

export const troubleshooting = [
  { type: 'h2', text: 'Traps specific to this application' },
  {
    type: 'table',
    head: ['Symptom', 'Cause', 'Fix'],
    rows: [
      [
        '`waiting for [role="listbox"] to be visible` while a panel is clearly open',
        'A closed dropdown leaves its panel in the DOM, so an unqualified selector resolves to the hidden one.',
        'Use `VISIBLE_LISTBOX` from `src/pages/bank/dropdown-panel.ts`.',
      ],
      [
        'A dialog never closes after submitting',
        'A required field was not filled. The application validates on submit and shows the message inside the dialog.',
        'Read the dialog text — it names the missing field. The add-account and add-biller dialogs each have a field with no test id.',
      ],
      [
        '`strict mode violation` on `bank-sidebar`',
        'The mobile drawer renders a second copy of the sidebar.',
        'Scope to the overlay with `shell.mobileNavLink()`. `.first()` picks the hidden desktop copy and can never be visible.',
      ],
      [
        'A wait for the unread count "0" times out',
        'The badge is removed from the DOM at zero rather than showing "0".',
        'Use `unreadCount()`, which reads absence as zero.',
      ],
      [
        '`toBeHidden()` fails on a visually hidden element',
        '`sr-only` clips to 1x1 rather than hiding, because a hidden element cannot be focused.',
        'Assert the bounding box instead.',
      ],
      [
        'A seeded-value assertion is off by a small amount',
        'The value was read from a session that had already performed a transfer.',
        'Re-read it from a fresh browser context and update `SEED`.',
      ],
    ],
  },

  { type: 'p', text: 'Failure modes, what they mean, and where to fix them.' },

  { type: 'h2', text: 'Setup and environment' },
  {
    type: 'table',
    head: ['Symptom', 'Cause', 'Fix'],
    rows: [
      [
        '`Invalid environment configuration:` on startup',
        'A variable failed zod validation.',
        'The message names the variable — fix it in `.env` or CI secrets.',
      ],
      [
        '`Missing credentials for role "admin"`',
        '`ADMIN_USER`/`ADMIN_PASSWORD` not set.',
        'Set them in `.env` locally or as repository secrets in CI.',
      ],
      [
        'Every test fails as unauthenticated',
        'Saved storage states expired.',
        'Delete `storage/*.json` and re-run; the `setup` project regenerates them.',
      ],
      [
        '`setup` project fails at login',
        'Placeholder selectors in `auth.setup.ts` do not match your login page.',
        'Replace them — this is the one file that must know your markup.',
      ],
      [
        'Modules load with empty exports; tooling fails in bizarre ways',
        'A corrupted dependency install.',
        '`rm -rf node_modules && npm ci`.',
      ],
      [
        'Playwright or ESLint crashes on an unusual Node version',
        'Non-LTS Node changes module resolution.',
        'Use the version in `.nvmrc` (Node 22).',
      ],
    ],
  },

  { type: 'h2', text: 'Flaky tests' },
  {
    type: 'table',
    head: ['Symptom', 'Likely cause', 'Where to fix'],
    rows: [
      [
        'Passes alone, fails in parallel',
        'Shared test data.',
        'Use the `testData` fixture.',
      ],
      [
        'Passes locally, fails in CI',
        'CI is slower, or the viewport differs.',
        'Fix the wait in the component; check the project viewport.',
      ],
      [
        'Fails intermittently on click',
        'Element still animating or moving.',
        'Set `waitForStable: true` on that component.',
      ],
      [
        'Toast assertion fails intermittently',
        'The toast auto-dismissed before the read.',
        '`Alert.waitForMessage()` captures during the visibility window.',
      ],
      [
        'Autocomplete selects the wrong option',
        'Assertion ran before the debounce settled.',
        '`typeAndSettle()` or configure `debounceMs`.',
      ],
      ['Grid row not found', 'Virtualised row not rendered.', '`DataGrid.scrollToRow()`.'],
      [
        'Visual diff on every run',
        'Dynamic region not masked.',
        'Add the selector to `DEFAULT_MASK_SELECTORS` or `data-visual-ignore`.',
      ],
    ],
  },

  { type: 'h2', text: 'Reading a failure' },
  {
    type: 'steps',
    items: [
      {
        text: 'Read the error message. Component failures name the component, the selector and the underlying cause.',
      },
      {
        text: 'Open the trace — `npm run report`, then the failing test. Steps are named after business actions.',
      },
      {
        text: 'Check the attachments: `failure-url.txt`, `dom-snapshot.html` and `browser-diagnostics.json` (console errors, page errors, failed requests).',
      },
      {
        text: 'Check `test-results/logs/test-run.log` for the structured log of the run; the `pid` field separates parallel workers.',
      },
      {
        text: 'Reproduce locally with the same seed — generated data is derived from the test title, so it repeats.',
        code: `npx playwright test --grep "applies a discount code" --headed --debug`,
      },
    ],
  },

  { type: 'h2', text: 'Debugging tools' },
  {
    type: 'table',
    head: ['Tool', 'Command', 'Best for'],
    rows: [
      ['UI mode', '`npm run test:ui`', 'Watch mode, time-travel, locator picking.'],
      ['Debug mode', '`npm run test:debug`', 'Stepping through with the inspector.'],
      ['Headed', '`npm run test:headed`', 'Watching the real interaction.'],
      ['Trace viewer', '`npm run report`', 'Post-mortem of a CI failure.'],
      ['Codegen', '`npm run codegen`', 'Discovering resilient locators.'],
      ['`component.highlight()`', 'in code', 'Confirming which element a locator resolves to.'],
      ['`component.getState()`', 'in code', 'One-call snapshot of everything observable.'],
      ['`LOG_LEVEL=trace`', 'env var', 'Seeing every framework action.'],
    ],
  },

  { type: 'h2', text: 'Performance' },
  {
    type: 'table',
    head: ['Problem', 'Fix'],
    rows: [
      [
        'Suite is slow overall',
        'Increase workers; shard in CI; ensure storage-state auth is used.',
      ],
      [
        'Individual tests are slow',
        'Seed through the API instead of the UI; block third-party assets.',
      ],
      [
        'CI is slow',
        'Increase the shard count in the matrix — wall-clock time stays flat as the suite grows.',
      ],
      [
        'Browser install dominates CI time',
        'The browser cache keyed on `package-lock.json` is already configured; confirm it is hitting.',
      ],
    ],
  },
];

export const glossary = [
  {
    type: 'table',
    head: ['Term', 'Meaning here'],
    rows: [
      [
        '**Persona**',
        'A demo account whose behaviour the application deliberately varies — locked, frozen, overdrawn, or carrying a planted defect. How negative paths are reached without mocking.',
      ],
      [
        '**Planted defect**',
        'A bug the application ships on purpose, for a suite to find. SecureBank has one: the loan history total omits the newest loan for `error_user`.',
      ],
      [
        '**Documented defect**',
        'A real defect the suite cannot fix, recorded with `test.fail()` so the expectation survives, the run stays green, and a fix turns the test red.',
      ],
      [
        '**Baselined violation**',
        'An accessibility rule already failing across the application, excluded by name from the gating scans so that any *new* violation still fails the build.',
      ],
      [
        '**Seed value**',
        'A fact about the starting dataset, held in `SEED` and read from a clean browser context — never from an exploratory session.',
      ],
    ],
  },

  { type: 'p', text: 'Terms used throughout this documentation and in the code.' },
  {
    type: 'table',
    head: ['Term', 'Meaning'],
    rows: [
      [
        '**Component**',
        'A class wrapping one kind of UI element, extending `BaseComponent`. Owns selectors and interaction behaviour.',
      ],
      [
        '**Page object**',
        'A class representing one screen, extending `BasePage`. Owns the URL, the ready indicator and business actions.',
      ],
      [
        '**Fixture**',
        'A Playwright dependency injected into a test. Test-scoped fixtures are rebuilt per test; worker-scoped fixtures once per worker.',
      ],
      [
        '**Project**',
        'A named Playwright run configuration — a browser, a device, or a specialised suite such as `visual`.',
      ],
      [
        '**Ready indicator**',
        'The element whose presence proves a page has finished rendering. Every page object must declare one.',
      ],
      [
        '**Storage state**',
        'A saved set of cookies and origin storage that replays an authenticated session without logging in again.',
      ],
      [
        '**Scope**',
        'What a component or factory is bound to: a page, a frame locator, or a container locator.',
      ],
      [
        '**SelectorLike**',
        'A CSS/XPath string, an existing Locator, or a function deriving one from a scope.',
      ],
      [
        '**Web-first assertion**',
        'An assertion that retries until it passes or times out (`await expect(locator).toBeVisible()`).',
      ],
      [
        '**Virtualised grid**',
        'A grid that renders only the visible window of rows; off-screen rows are absent from the DOM.',
      ],
      [
        '**Blob report**',
        'Playwright’s intermediate report format, produced per shard and merged into one HTML report.',
      ],
      [
        '**Trace**',
        'A recorded timeline of a test — DOM snapshots, actions, network — replayable in the trace viewer.',
      ],
      ['**Flaky test**', 'A test that passed only on retry. Tracked in `reports/summary.json`.'],
      ['**Tag**', 'A marker in a test title (`@smoke`) used by `--grep` to slice the suite.'],
      [
        '**Named timeout budget**',
        'A constant in `timeouts.ts` used instead of a literal, so waits can be tuned as a class.',
      ],
    ],
  },
];
