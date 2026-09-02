/** Documentation for src/config, src/core and src/types. */
export default {
  'src/config/env.config.ts': {
    group: 'config',
    title: 'Environment resolution',
    purpose:
      'The only file in the framework permitted to read `process.env`. It loads `.env`, then `.env.<TEST_ENV>` on top, validates everything against a zod schema, and exports one frozen `config` object plus `getUser(role)` for credentials.',
    blocks: [
      {
        type: 'code',
        caption: 'What consumers see',
        text: `import { config, getUser } from '@config/index';

config.baseURL;            // resolved URL for the selected environment
config.timeouts.action;    // validated number, never a string
config.artifacts.trace;    // 'on' | 'off' | 'retain-on-failure' | 'on-first-retry'
config.paths.downloads;    // absolute path, directories created by global setup

const admin = getUser('admin');   // throws a named error if the secret is missing`,
      },
      {
        type: 'ul',
        items: [
          '`booleanish(fallback)` and `numeric(fallback)` pre-process raw strings into real booleans and numbers, falling back to a documented default instead of throwing on an empty variable.',
          'Real process variables always beat `.env` files, so CI secrets are never overwritten by a stray local file.',
          '`HEADLESS` is forced to true when `CI` is set — a headed browser on a CI runner hangs.',
          'Validation failure raises one error listing every offending variable, before a single browser starts.',
        ],
      },
    ],
    changeWhen: [
      'You introduce a new environment variable.',
      'You add a user role that needs credentials.',
      'A default value proves wrong for most runs.',
      'You need a new derived path under `config.paths`.',
    ],
    changeHow: [
      {
        text: 'Add the variable to the zod schema with a sensible fallback.',
        code: `const schema = z.object({
  // ...
  FEATURE_FLAGS: z.string().optional(),
  MAX_UPLOAD_MB: numeric(25),
});`,
      },
      {
        text: 'Expose it on the exported `config` object with the shape callers should see, converting or splitting it here rather than at every call site.',
        code: `export const config = {
  // ...
  featureFlags: (raw.FEATURE_FLAGS ?? '').split(',').map((f) => f.trim()).filter(Boolean),
  maxUploadMb: raw.MAX_UPLOAD_MB,
} as const;`,
      },
      {
        text: 'Document it in `.env.example` in the same commit, and add it to the CI workflow if it must be set there.',
      },
      {
        text: 'For a new credentialled role, add the variables to the schema and a row to the `CREDENTIALS` map; `getUser` then validates it automatically.',
        code: `const CREDENTIALS: Record<UserRole, { username?: string; password?: string }> = {
  // ...
  auditor: { username: raw.AUDITOR_USER, password: raw.AUDITOR_PASSWORD },
};`,
      },
    ],
    why: 'Centralising environment access converts a whole class of silent misconfiguration — a suite pointed at the wrong host, a timeout parsed as `NaN`, a login attempted with `undefined` — into one loud, immediate, specific error. Reading `process.env` anywhere else reintroduces exactly that risk.',
    gotchas: [
      'The role name must also exist in the `UserRole` union in `src/types/index.ts`, or TypeScript will reject the `CREDENTIALS` entry.',
      'This module executes at import time. Keep it free of side effects beyond reading files and creating no I/O.',
    ],
    related: [
      'src/config/environments.ts',
      'src/config/timeouts.ts',
      '.env.example',
      'src/types/index.ts',
    ],
  },

  'src/config/environments.ts': {
    group: 'config',
    title: 'Environment registry',
    purpose:
      'Static, non-secret settings for each environment — base URL, API URL, default retries and workers, and whether to ignore HTTPS errors. Safe to commit and the single source of truth for where an environment lives.',
    changeWhen: [
      'A new environment appears (a preview tier, a regional deployment).',
      'An existing environment moves to a different URL.',
      'One environment needs different retry or parallelism defaults — a shared staging box may need fewer workers than a dedicated QA box.',
    ],
    changeHow: [
      {
        text: 'Add the name to the `EnvironmentName` union in `src/types/index.ts` first; TypeScript will then require the matching entry here.',
        code: `export type EnvironmentName = 'local' | 'dev' | 'qa' | 'staging' | 'preprod' | 'prod';`,
      },
      {
        text: 'Add the entry with all five fields.',
        code: `preprod: {
  name: 'preprod',
  baseURL: 'https://preprod.example.com',
  apiBaseURL: 'https://preprod.example.com/api',
  retries: 2,
  workers: 4,
  ignoreHTTPSErrors: false,
},`,
      },
      {
        text: 'Extend the `TEST_ENV` enum in the zod schema in `env.config.ts`, and add the value to the CI workflow’s environment choice list.',
      },
    ],
    why: 'URLs are configuration, not secrets. Keeping them in version control means a reviewer can see exactly which host a change targets, and switching environments is one variable rather than a hunt through scripts.',
    gotchas: [
      'Never add credentials here. This file is committed; secrets come from the process environment.',
    ],
    related: ['src/config/env.config.ts', 'src/types/index.ts'],
  },

  'src/config/timeouts.ts': {
    group: 'config',
    title: 'Named timeout budgets',
    purpose:
      'Every wait in the framework references one of these named budgets — `INSTANT`, `SHORT`, `MEDIUM`, `LONG`, `EXTRA_LONG`, `TEST`, `HOOK`, `EXPECT`, `POLL_INTERVAL`, `DEBOUNCE`, `ANIMATION` — so tuning flakiness is a single-file change instead of a repo-wide hunt for magic numbers.',
    blocks: [
      {
        type: 'table',
        head: ['Budget', 'Default', 'Use for'],
        rows: [
          ['`INSTANT`', '1s', 'A class toggle, a fade, a ripple.'],
          ['`SHORT`', '5s', 'Tooltips, dropdown opening, toast appearance.'],
          ['`MEDIUM`', '15s', 'Default for any element interaction.'],
          ['`LONG`', '30s', 'Navigation, route change, heavy client render.'],
          ['`EXTRA_LONG`', '60s', 'Upload, download, report generation.'],
          ['`DEBOUNCE`', '500ms', 'Settle time after typing into a search field.'],
          ['`ANIMATION`', '300ms', 'Settle time before a screenshot comparison.'],
        ],
      },
    ],
    changeWhen: [
      'A category of interaction is genuinely slower in your application.',
      'You need a new named category (for example `REPORT_GENERATION`).',
    ],
    changeHow: [
      {
        text: 'Add or adjust the named budget, then use the name — never the number — at the call site.',
        code: `export const TIMEOUTS = {
  // ...
  REPORT_GENERATION: 180_000,
} as const;

await this.locator.waitFor({ state: 'visible', timeout: TIMEOUTS.REPORT_GENERATION });`,
      },
    ],
    why: 'A raw `30000` scattered through a suite tells the next reader nothing about intent. A name says what class of wait it is, which makes it safe to tune every wait of that class at once when the application changes.',
    gotchas: [
      'Raising a timeout hides slowness rather than fixing it. Confirm the wait is legitimately long before increasing a budget.',
    ],
    related: ['src/config/env.config.ts', 'src/core/base.component.ts'],
  },

  'src/config/index.ts': {
    group: 'config',
    title: 'Config barrel',
    purpose:
      'Re-exports `config`, `getUser`, `ENVIRONMENTS`, `getEnvironment` and `TIMEOUTS` so consumers import from `@config/index` rather than reaching into individual files.',
    changeWhen: ['You add a file to `src/config/` that other layers should use.'],
    changeHow: [
      {
        text: 'Add the re-export line. Keep internal helpers out of the barrel so the public surface stays small.',
      },
    ],
    why: 'A single import path means moving or splitting a config file later does not ripple through the codebase.',
    related: ['src/config/env.config.ts'],
  },

  'src/core/base.component.ts': {
    group: 'core',
    title: 'BaseComponent — the foundation of every UI element',
    purpose:
      'The most important file in the framework. Every component in `src/components/` extends this class, so the behaviour that must be identical everywhere — step reporting, structured logging, scroll and stability handling, state inspection, named assertions and failure diagnostics — is written once here and inherited rather than copy-pasted.',
    blocks: [
      {
        type: 'ul',
        items: [
          '**Reported steps.** `this.step(title, fn)` wraps every public action in `test.step`, so a trace reads `Table "Results": sort by "Amount" desc` instead of an anonymous click.',
          '**Contextual failures.** A failure is re-thrown naming the component, its selector and the original cause, attached as `cause`.',
          '**Pre-action hygiene.** `prepare()` waits for visibility, scrolls into view, and optionally waits for the bounding box to stop moving — before every interaction.',
          '**State inspection.** `getState()` returns existence, visibility, enablement, editability, checked state, focus, text, value, box and every attribute in one call.',
          '**Named assertions.** `expectVisible`, `expectText`, `expectCount` and friends wrap web-first assertions with messages that identify the component.',
          '**Narrowing.** `nth(n)` (1-based, to read naturally), `first()` and `filterByText()` return a new instance of the same subclass.',
        ],
      },
      {
        type: 'code',
        caption: 'The pattern every subclass follows',
        text: `export class Button extends BaseComponent {
  protected override get componentType(): string {
    return 'Button';   // shown in logs and step titles
  }

  async clickWhenReady(options: ClickOptions = {}): Promise<void> {
    await this.step('click when enabled', async () => {   // reported step
      await this.waitForEnabled();
      await this.prepare();                                // scroll + stability
      await this.locator.click({ timeout: this.timeout, ...options });
    });
  }
}`,
      },
    ],
    changeWhen: [
      'A behaviour should apply to every element type — a new universal wait, a new diagnostic, a logging change.',
      'You want to change what happens before every interaction.',
      'You need a new shared assertion.',
    ],
    changeHow: [
      {
        text: 'Add the method here only if it is meaningful for every element. If it applies to one family, put it on that component instead.',
        code: `/** Waits until the element stops reporting an ARIA busy state. */
async waitForNotBusy(timeout = this.timeout): Promise<void> {
  await this.step('wait for aria-busy to clear', async () => {
    await expect(this.locator).not.toHaveAttribute('aria-busy', 'true', { timeout });
  });
}`,
      },
      {
        text: 'Wrap it in `this.step()` so it appears in traces, and use `this.timeout` so per-component overrides are honoured.',
      },
      {
        text: 'To change pre-action behaviour for everything, edit `prepare()`. Measure the cost first — it runs before every single interaction in the suite.',
      },
    ],
    why: 'This is the leverage point of the whole framework: one method here becomes available to all 37 component types with no duplication, and one improvement to error messages improves every failure in the suite.',
    gotchas: [
      '`getValue()` is deliberately named `getInputValue()` on the base class so components whose value is numeric (`Slider`, `ProgressBar`) can define a correctly-typed `getValue()` of their own.',
      'Anything added here runs everywhere; an expensive check will slow the entire suite.',
      '`nth()` is 1-based here while Playwright’s own `nth()` is 0-based — the class converts.',
    ],
    related: [
      'src/core/locator.factory.ts',
      'src/core/base.page.ts',
      'src/components/component.factory.ts',
    ],
  },

  'src/core/base.page.ts': {
    group: 'core',
    title: 'BasePage — the foundation of every page object',
    purpose:
      'Base class for page objects. It owns navigation, load verification, page-level waits and page-level assertions, and requires every subclass to declare two things: the `path` it lives at and a `readyIndicator` that proves it finished rendering.',
    blocks: [
      {
        type: 'code',
        caption: 'The two required declarations',
        text: `export class CheckoutPage extends BasePage {
  protected readonly path = '/checkout';
  protected readonly readyIndicator: SelectorLike = '[data-testid="checkout-root"]';
}`,
      },
      {
        type: 'ul',
        items: [
          '`goto()` navigates with query parameters and waits until the page is genuinely usable.',
          '`waitUntilLoaded()` blocks on the ready indicator; override it to add further checks.',
          '`waitForIdle()` waits for network quiet and an optional spinner to disappear.',
          '`actionWithResponse()` runs an action and returns the API response it triggered.',
          '`isCurrentPage()` supports conditional flows without throwing.',
          '`checkAccessibility()` runs an axe scan on the page.',
        ],
      },
    ],
    changeWhen: [
      'Every page in your application shares a behaviour — a cookie banner to dismiss, a global spinner, a tenant switch.',
      'You need a new page-level assertion or wait.',
    ],
    changeHow: [
      {
        text: 'Add the shared behaviour here so no page object repeats it.',
        code: `/** Dismisses the consent banner if the application decided to show it. */
protected async dismissConsentBanner(): Promise<void> {
  const accept = this.page.getByRole('button', { name: /accept all/i });
  if (await accept.isVisible().catch(() => false)) await accept.click();
}`,
      },
      {
        text: 'To make it automatic, call it from an overridden `waitUntilLoaded()` — and remember that subclasses overriding that method must call `super`.',
        code: `override async waitUntilLoaded(timeout?: number): Promise<void> {
  await super.waitUntilLoaded(timeout);
  await this.dismissConsentBanner();
}`,
      },
    ],
    why: 'Requiring a ready indicator is what makes navigation deterministic: without it, page objects fall back to arbitrary sleeps, which is the most common source of flakiness in UI suites.',
    gotchas: [
      'Page objects must not contain business assertions. Verifying that the page loaded is in scope; verifying that the order total is $80 is the test’s job.',
    ],
    related: ['src/pages/template.page.ts', 'src/core/base.component.ts'],
  },

  'src/core/locator.factory.ts': {
    group: 'core',
    title: 'Locator resolution and strategies',
    purpose:
      'Resolves any `SelectorLike` — a CSS or XPath string, an existing `Locator`, or a function that derives one from a scope — into a real Locator, applying the iframe and shadow-DOM options a component declares. Also exports `by`, the catalogue of locator strategies in order of resilience.',
    blocks: [
      {
        type: 'code',
        caption: 'Why this makes iframes ordinary',
        text: `const frame = new Frame(page, '#payment-iframe');
const cardNumber = new TextInput(frame.locator, '#card-number');   // identical API`,
      },
      {
        type: 'table',
        head: ['Preference', 'Strategy', 'When'],
        rows: [
          ['1', '`by.testId`', 'Default. Stable against copy and styling changes.'],
          ['2', '`by.role`', 'Accessible and expresses intent.'],
          ['3', '`by.label` / `by.placeholder`', 'Form controls with visible labels.'],
          ['4', '`by.text`', 'Buttons and links whose text is the contract.'],
          ['5', '`by.css`', 'Legacy markup with nothing better.'],
          ['6', '`by.xpath`', 'Last resort — structural and brittle.'],
        ],
      },
    ],
    changeWhen: [
      'Your application needs a locator strategy that is not covered (a framework-specific attribute, a data-cy convention).',
      'A new scoping mechanism appears — nested shadow roots, a custom portal container.',
    ],
    changeHow: [
      {
        text: 'Add the strategy to the `by` object with a short comment about when it is appropriate.',
        code: `by.automationId = (scope: Page | Locator, id: string): Locator =>
  scope.locator(\`[data-automation-id="\${id}"]\`);`,
      },
      {
        text: 'If the whole application uses a different test-id attribute, change `testIdAttribute` in `playwright.config.ts` instead — then `getByTestId` and `by.testId` both follow it.',
      },
    ],
    why: 'Centralising resolution is what allows every component to accept three different selector forms without each one re-implementing the logic, and what keeps iframe and shadow-DOM handling out of the component code entirely.',
    related: [
      'src/core/base.component.ts',
      'src/components/media/frame.ts',
      'playwright.config.ts',
    ],
  },

  'src/core/index.ts': {
    group: 'core',
    title: 'Core barrel',
    purpose: 'Re-exports `BaseComponent`, `BasePage`, `by`, `resolveLocator` and the `Scope` type.',
    changeWhen: ['You add a file to `src/core/`.'],
    changeHow: [{ text: 'Add the re-export so consumers keep using `@core/index`.' }],
    why: 'Keeps the framework foundation reachable through one import path.',
    related: ['src/core/base.component.ts'],
  },

  'src/types/index.ts': {
    group: 'types',
    title: 'Shared type definitions',
    purpose:
      'Every cross-cutting type in one place: environment names and shape, user roles, component options, `SelectorLike`, `ElementState`, click and fill options, table and sorting types, network mocking and capture shapes, accessibility and visual options, and the retry policy.',
    blocks: [
      {
        type: 'ul',
        items: [
          '`SelectorLike` is what lets components accept a string, a Locator or a builder function.',
          '`ComponentOptions` carries `name`, `timeout`, `autoScroll`, `waitForStable`, `frameSelector` and `shadowHost` — every component extends it for its own selectors.',
          '`ElementState` is the diagnostic snapshot returned by `getState()`.',
          '`UserRole` and `EnvironmentName` are unions, so adding a value makes TypeScript point at every place that must handle it.',
        ],
      },
    ],
    changeWhen: [
      'You add a role, an environment, or a concept shared by more than one module.',
      'A component option becomes generally useful.',
    ],
    changeHow: [
      {
        text: 'Add the union member or interface field here first, then follow the compiler errors — they are a complete to-do list of everywhere that must be updated.',
        code: `export type UserRole = 'standard' | 'admin' | 'readonly' | 'guest' | 'auditor';`,
      },
      {
        text: 'Keep types that belong to exactly one component in that component’s file; only genuinely shared shapes belong here.',
      },
    ],
    why: 'A union defined once turns "add a role" from a search-and-hope exercise into a compiler-guided checklist. That property disappears the moment the same union is redeclared elsewhere.',
    related: [
      'src/config/environments.ts',
      'src/config/env.config.ts',
      'src/core/base.component.ts',
    ],
  },

  'src/types/xlsx-populate.d.ts': {
    group: 'types',
    title: 'Ambient types for xlsx-populate',
    purpose:
      'Minimal type declarations for the `xlsx-populate` package, which ships none. Only the surface the framework uses — `fromFileAsync`, `sheet`, `sheets`, `usedRange().value()` — is declared.',
    changeWhen: [
      'You start using more of the spreadsheet library’s API, or the package begins shipping its own types.',
    ],
    changeHow: [
      {
        text: 'Add the method to the interface with the narrowest accurate type. If the package publishes official types, delete this file and remove the reference.',
      },
    ],
    why: 'Declaring only what is used keeps the fiction small and honest; a sprawling hand-written declaration file eventually disagrees with the library and hides real errors.',
    related: ['src/utils/file.utils.ts'],
  },
};
