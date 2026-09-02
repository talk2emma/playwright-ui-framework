/** Documentation for fixtures, hooks, page objects, API client and reporters. */
export default {
  'src/fixtures/base.fixture.ts': {
    group: 'fixtures',
    title: 'Base fixtures',
    purpose:
      'Composes the `test` object every spec uses. It adds the framework’s fixtures — component factory, logger, network control, console capture, generated data, credentials, API client — and overrides the built-in `page` fixture to attach diagnostics on failure and enforce the console-error policy.',
    blocks: [
      {
        type: 'table',
        head: ['Fixture', 'Scope', 'Provides'],
        rows: [
          ['`ui`', 'test', 'Component factory bound to the page.'],
          [
            '`log`',
            'test',
            'Logger scoped to the test title; logs start and finish with status and duration.',
          ],
          [
            '`network`',
            'test',
            'Mocking, latency, abort, offline and request capture. Routes are reset after the test.',
          ],
          [
            '`consoleErrors`',
            'test',
            'Console errors, page errors and failed requests recorded during the test.',
          ],
          [
            '`testData`',
            'test',
            'A generated user, seeded from the test title so retries reproduce the same data.',
          ],
          ['`userFor`', 'test', '`getUser(role)` for credentials.'],
          ['`appConfig`', 'test', 'The validated configuration object.'],
          [
            '`failOnConsoleErrors`',
            'test (option)',
            'Opt-in policy that fails a test if the page logged console errors.',
          ],
          ['`api`', 'worker', 'One HTTP client per worker, disposed at the end.'],
        ],
      },
      {
        type: 'code',
        caption: 'Enabling the console-error policy for a file or a test',
        text: `test.use({ failOnConsoleErrors: true });

test('checkout is clean @smoke', async ({ page, consoleErrors }) => {
  // ... the test fails at the end if the page logged an error
});`,
      },
    ],
    changeWhen: [
      'Every test needs something new — a seeded tenant, a feature-flag override, a page object bundle.',
      'You want different diagnostics attached on failure.',
      'A resource is expensive and should be created once per worker instead of per test.',
    ],
    changeHow: [
      {
        text: 'Add the fixture’s type to `TestFixtures` (or `WorkerFixtures`), then implement it. Code before `use()` is setup; code after is teardown.',
        code: `export interface TestFixtures {
  // ...
  tenant: Tenant;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  tenant: async ({ api }, use) => {
    const tenant = await api.post<Tenant>('/tenants', { name: generateUser(faker).username });
    await use(tenant);
    await api.delete(\`/tenants/\${tenant.id}\`);   // always clean up
  },
});`,
      },
      {
        text: 'To change failure diagnostics, edit `attachDiagnostics`. Keep each attachment guarded with `.catch()` so a diagnostic failure never masks the real one.',
      },
      {
        text: 'Use worker scope for anything expensive and stateless; use test scope for anything a test could mutate.',
        code: `api: [async ({}, use) => { /* ... */ }, { scope: 'worker' }],`,
      },
    ],
    why: 'Fixtures are how the framework reaches tests without imports or inheritance. Adding a capability here makes it available everywhere, with automatic teardown and no boilerplate in specs.',
    gotchas: [
      '`consoleErrors` deliberately does not depend on `page`; the overridden `page` attaches the listeners. A mutual dependency would be a fixture cycle and Playwright would refuse to run.',
      '`testData` is seeded from the test title, so renaming a test changes its generated data.',
    ],
    related: [
      'src/fixtures/auth.fixture.ts',
      'src/fixtures/index.ts',
      'src/utils/browser.utils.ts',
    ],
  },

  'src/fixtures/auth.fixture.ts': {
    group: 'fixtures',
    title: 'Authentication fixtures',
    purpose:
      'Extends the base fixtures with authenticated browsing: `authenticatedContext` and `authenticatedPage` for the standard user, and `pageAs(role)` for signing in as any role on demand. Sessions are replayed from the storage state files written by `auth.setup.ts`.',
    blocks: [
      {
        type: 'code',
        caption: 'Two users in one test',
        text: `test('admin sees the audit trail a viewer cannot', async ({ pageAs }) => {
  const adminPage  = await pageAs('admin');
  const viewerPage = await pageAs('readonly');
  // both contexts are independent and already signed in
});`,
      },
    ],
    changeWhen: [
      'You add a role that tests need to browse as.',
      'Your application needs more than cookies to restore a session (a tenant header, a local-storage token).',
    ],
    changeHow: [
      {
        text: "Add the role to `UserRole`, add its credentials, add it to the `ROLES` array in `auth.setup.ts` — then `pageAs('auditor')` works with no change here.",
      },
      {
        text: 'If the session needs extra state, set it on the context after creation.',
        code: `await context.addInitScript(() => window.localStorage.setItem('tenant', 'acme'));`,
      },
    ],
    why: 'Replaying a saved session removes a login from every test. On a suite of 300 tests at 8 seconds per login, that is roughly 40 minutes of wall-clock time per run.',
    gotchas: [
      '`storageStateFor()` returns `undefined` when the file does not exist, so a suite that does not use auth still runs — the tests simply start signed out.',
    ],
    related: ['src/hooks/auth.setup.ts', 'src/config/env.config.ts'],
  },

  'src/fixtures/custom-matchers.ts': {
    group: 'fixtures',
    title: 'Custom assertions',
    purpose:
      'Domain-specific matchers that extend Playwright’s `expect`: `toBeAccessible`, `toBeInteractive`, `toHaveNormalizedText`, `toHaveValidationError`, `toBeInViewport` and `toBeSorted`. Each exists because the equivalent inline check appeared often enough to deserve a name — and because a named matcher produces a far better failure message.',
    blocks: [
      {
        type: 'code',
        caption: 'Usage',
        text: `await expect(page).toBeAccessible({ tags: ['wcag2aa'] });
await expect(saveButton.locator).toBeInteractive();
await expect(total).toHaveNormalizedText('Total  due');   // whitespace-insensitive
await expect(emailField.locator).toHaveValidationError(/valid email/i);
expect(await table.getColumnValues('Amount')).toBeSorted('desc');`,
      },
    ],
    changeWhen: ['The same multi-step assertion appears in three or more tests.'],
    changeHow: [
      {
        text: 'Add the matcher to the `expect.extend` object. Return `pass` plus a `message` function that explains both directions — the negated form is what makes a matcher pleasant to debug.',
        code: `async toHaveRowCount(table: Table, expected: number) {
  const actual = await table.rowCount();
  return {
    pass: actual === expected,
    message: () =>
      actual === expected
        ? \`Expected the table not to have \${expected} rows\`
        : \`Expected \${expected} rows but found \${actual}\`,
    name: 'toHaveRowCount',
  };
}`,
      },
      {
        text: 'TypeScript picks up the new matcher automatically because `expect` is exported from here; no declaration merging is needed.',
      },
    ],
    why: 'A failure that says "expected ascending order: actual 30, 10 / expected 10, 30" is diagnosable from the CI log alone. `expect(true).toBe(false)` is not.',
    related: ['src/fixtures/index.ts', 'src/utils/a11y.utils.ts'],
  },

  'src/fixtures/index.ts': {
    group: 'fixtures',
    title: 'Fixture barrel — the import every test uses',
    purpose:
      'Re-exports the composed `test` and the extended `expect`. This is the single import surface for specs, and importing from here rather than from `@playwright/test` is what guarantees a test gets the framework’s fixtures and matchers.',
    blocks: [
      {
        type: 'rule',
        text: 'Tests import `test` and `expect` from `@fixtures/index` — never from `@playwright/test` directly.',
      },
      {
        type: 'code',
        caption: 'Every spec starts this way',
        text: `import { test, expect } from '@fixtures/index';`,
      },
    ],
    changeWhen: ['You add a fixture module that tests should reach.'],
    changeHow: [
      {
        text: 'Extend the chain in `auth.fixture.ts` (which already extends `base.fixture.ts`) and re-export here, so tests keep one import line.',
      },
    ],
    why: 'One import path means new capabilities reach every existing test with no edits to those tests.',
    related: ['src/fixtures/base.fixture.ts', 'src/fixtures/auth.fixture.ts'],
  },

  'src/hooks/global.setup.ts': {
    group: 'hooks',
    title: 'Global setup',
    purpose:
      'Runs once before the entire suite, in the parent process: creates the report, results, storage and download directories, removes the previous HTML report so a stale one cannot be mistaken for the current run, logs the resolved run configuration, and records the start time.',
    changeWhen: [
      'The suite needs one-time preparation — a database reset, a feature-flag snapshot, a health check on the target environment.',
    ],
    changeHow: [
      {
        text: 'Keep it cheap and idempotent; it blocks every worker. Anything per-role belongs in `auth.setup.ts`, anything per-test in a fixture.',
        code: `const health = await fetch(\`\${config.baseURL}/health\`);
if (!health.ok) {
  throw new Error(\`\${config.env} is not healthy (\${health.status}) — aborting before wasting a full run\`);
}`,
      },
    ],
    why: 'Failing here costs seconds and produces one clear message. Discovering the same problem through 300 timing-out tests costs an hour and produces noise.',
    gotchas: [
      'This runs in the parent process, so variables set here are not shared with workers except through `process.env`.',
    ],
    related: ['src/hooks/global.teardown.ts', 'playwright.config.ts'],
  },

  'src/hooks/global.teardown.ts': {
    group: 'hooks',
    title: 'Global teardown',
    purpose:
      'Runs once after the entire suite: removes the temporary scratch directory and logs total duration and where reports were written. Artifacts — traces, videos, reports — are deliberately left in place.',
    changeWhen: [
      'The suite creates shared external state that must be cleaned up, or you want to publish results somewhere.',
    ],
    changeHow: [
      {
        text: 'Add the cleanup, and guard it so a teardown failure does not mask the real test results.',
        code: `try {
  await archiveReports();
} catch (error) {
  logger.warn('Report archiving failed', { error: String(error) });
}`,
      },
    ],
    why: 'Per-test data should be cleaned by the fixture that created it; teardown is only for suite-wide state, so it stays small and reliable.',
    related: ['src/hooks/global.setup.ts'],
  },

  'src/hooks/auth.setup.ts': {
    group: 'hooks',
    title: 'Authentication setup — the one file that must know your app',
    purpose:
      'Runs as the `setup` project before every other project. For each role it signs in through the UI once and saves the session to `storage/<role>.json`. Its `signIn` function contains the only application-specific selectors in the framework.',
    blocks: [
      {
        type: 'warn',
        text: 'This is the first file to edit when you point the framework at a real application. Its placeholder selectors will not match your login page.',
      },
      {
        type: 'code',
        caption: 'What to replace',
        text: `async function signIn(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/username|email/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Prove the session is real before saving it.
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: config.timeouts.navigation,
  });
}`,
      },
    ],
    changeWhen: [
      'Your login page differs from the placeholder (it will).',
      'You add a role that needs a saved session.',
      'Login involves an extra step — SSO, MFA, a tenant chooser, a consent screen.',
    ],
    changeHow: [
      {
        text: 'Replace the selectors in `signIn`, or delegate to a `LoginPage` page object once you have one.',
        code: `const login = new LoginPage(page);
await login.goto();
await login.signIn(username, password);`,
      },
      {
        text: 'Add the role to the `ROLES` array; a storage state is then produced for it automatically.',
        code: `const ROLES: UserRole[] = ['standard', 'admin', 'auditor'];`,
      },
      {
        text: 'For MFA, prefer a test account with MFA disabled or a deterministic TOTP seed generated in code — never a manual step.',
      },
    ],
    why: 'Verifying the redirect before saving the state is what turns one login failure into one clear setup failure, instead of an entire suite failing later with unexplained authorisation errors.',
    gotchas: [
      'Storage states expire when your session tokens do. If tests start failing as unauthenticated, delete `storage/*.json` and re-run.',
      'Never commit `storage/*.json` — those files are live sessions.',
    ],
    related: ['src/fixtures/auth.fixture.ts', 'src/config/env.config.ts', '.gitignore'],
  },
  'src/api/api.client.ts': {
    group: 'api',
    title: 'API client',
    purpose:
      'A thin HTTP client for **test setup**, not for testing the API itself. GET, POST, PUT, PATCH, DELETE and a raw fetch, with the base URL, auth header and TLS policy taken from the validated configuration, and errors that include status and body.',
    blocks: [
      {
        type: 'code',
        caption: 'Seed over HTTP, assert in the UI',
        text: `const order = await api.post<Order>(ENDPOINTS.orders.create, { items: [{ sku: 'A1', qty: 2 }] });
await ordersPage.goto();
await expect(ordersPage.rowFor(order.id)).toBeVisible();`,
      },
      {
        type: 'note',
        text: 'Seeding through the API takes about 200 ms. Driving the same setup through the UI takes 20 seconds and couples the test to screens it is not testing.',
      },
    ],
    changeWhen: [
      'You need a new HTTP verb, different auth (cookie, API key, mTLS), retries, or request logging.',
    ],
    changeHow: [
      {
        text: 'Add the header or option in the context creation so every request inherits it.',
        code: `extraHTTPHeaders: {
  'Content-Type': 'application/json',
  ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
  'X-Tenant': config.tenant,
},`,
      },
      {
        text: 'Wrap a flaky endpoint with the `retry` helper rather than adding retries to every call site.',
      },
    ],
    why: 'Restricting this client to setup keeps the boundary clear: UI tests verify the interface, and the API is used to arrange state quickly. Testing the API itself belongs in an API suite.',
    related: ['src/utils/retry.utils.ts'],
  },
  'src/reporters/summary.reporter.ts': {
    group: 'reporters',
    title: 'Summary reporter',
    purpose:
      'A custom Playwright reporter that prints a compact end-of-run summary and writes `reports/summary.json` containing totals, every failure with its first error line, flaky tests, the five slowest tests and the full test list with tags and durations.',
    blocks: [
      { type: 'h3', text: 'Expected failures are passes' },
      {
        type: 'code',
        caption: 'The outcome, not the raw status',
        text: `const met = result.status === test.expectedStatus;
const outcome =
  met && result.status === 'failed' ? 'passed'
  : !met && result.status === 'passed' ? 'failed'
  : result.status;`,
      },
      {
        type: 'p',
        text: 'A test annotated `test.fail()` is **expected** to fail, and Playwright records that in `test.expectedStatus`. Its raw `result.status` is still `failed`, so counting that directly reports a green run as red — which is exactly what happened once the suite began recording known defects this way.',
      },
      {
        type: 'p',
        text: 'The stored status is therefore the *outcome*: whether the result matched what was expected. An expected failure is a pass; an unexpectedly **passing** `test.fail()` is a failure — which is the whole point of the annotation, because it means the defect has been fixed and the annotation should be removed.',
      },
      {
        type: 'note',
        text: '`expectedFailure` is recorded per test, so a pipeline can report "111 passed, 4 of them documented defects" rather than hiding the distinction.',
      },

      {
        type: 'code',
        caption: 'Consuming the summary in CI',
        text: `const summary = JSON.parse(fs.readFileSync('reports/summary.json', 'utf8'));
if (summary.totals.flaky > 0) core.warning(\`\${summary.totals.flaky} flaky tests\`);
for (const failure of summary.failures) core.error(\`\${failure.title}: \${failure.error}\`);`,
      },
    ],
    changeWhen: [
      'A dashboard, Slack notification or PR comment needs another field — ownership, suite name, retry count, browser.',
    ],
    changeHow: [
      {
        text: 'Add the field in `onTestEnd` where the test result is available, then include it in the `summary` object in `onEnd`.',
        code: `this.tests.push({
  // ...
  annotations: test.annotations.map((a) => a.type),
  browser: test.parent.project()?.use.browserName ?? 'unknown',
});`,
      },
    ],
    why: 'CI needs machine-readable results. Answering "what broke and how slow are we" from a JSON file is far cheaper than downloading and unzipping an HTML report.',
    gotchas: [
      'Passing `--reporter=...` on the command line replaces the configured reporters, so this one does not run on those invocations.',
    ],
    related: ['playwright.config.ts'],
  },
};
