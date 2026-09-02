/** Documentation for utilities, test data, tests folder and existing docs. */
export default {
  'src/utils/logger.ts': {
    group: 'utils',
    title: 'Logger',
    purpose:
      'Structured logging with console and file output, deliberately dependency-free. Five levels (`error`, `warn`, `info`, `debug`, `trace`), nested scopes, colour when attached to a terminal, and JSON-lines files at `test-results/logs/test-run.log` and `errors.log`.',
    blocks: [
      {
        type: 'code',
        caption: 'Scoped logging',
        text: `const log = createLogger('CheckoutPage');
log.info('Applying discount', { code: 'SAVE20' });
log.child('promo').debug('Server responded', { status: 200 });   // scope: CheckoutPage:promo`,
      },
      {
        type: 'note',
        text: 'Errors and warnings go to stderr; everything else to stdout, so CI error streams stay signal-only.',
      },
    ],
    changeWhen: [
      'You need a new destination (a log aggregator), a different format, or an extra field on every line.',
    ],
    changeHow: [
      {
        text: 'Add a sink and write to it in `emit`. Keep every write inside a guard — logging must never be the reason a test fails.',
        code: `class HttpSink {
  write(line: string): void {
    void fetch(process.env.LOG_ENDPOINT!, { method: 'POST', body: line }).catch(() => undefined);
  }
}`,
      },
    ],
    why: 'General-purpose logging libraries pull in stream polyfills that break across Node releases; a test framework cannot afford a logger that fails to load. Everything needed here is a few dozen lines.',
    gotchas: [
      'Workers are separate processes, so log lines from parallel tests interleave. The `pid` field on every record is how you separate them.',
    ],
    related: ['src/config/env.config.ts', 'src/fixtures/base.fixture.ts'],
  },

  'src/utils/retry.utils.ts': {
    group: 'utils',
    title: 'Retry and polling helpers',
    purpose:
      '`waitUntil` — polls a condition until it holds or the timeout elapses, and fails with a message naming the condition. Used where Playwright has no web-first assertion to wait on, such as a progress bar reaching a value.',
    blocks: [
      {
        type: 'warn',
        text: 'These are for genuinely flaky boundaries — a third-party widget, a download that occasionally 502s. They are not a substitute for a web-first assertion; prefer Playwright’s auto-waiting and `expect.poll` first.',
      },
      {
        type: 'code',
        caption: 'Selective retry',
        text: `await retry(
  () => api.post('/reports', { type: 'monthly' }),
  { attempts: 3, delayMs: 500, retryOn: (error) => error.message.includes('503') },
  'monthly report generation',
);`,
      },
    ],
    changeWhen: ['You need a different backoff strategy, jitter, or a shared default policy.'],
    changeHow: [
      { text: 'Extend `RetryPolicy` in `src/types/index.ts` and honour the new field in `retry`.' },
    ],
    why: 'A retry that wraps every failure hides real bugs; `retryOn` is what keeps retrying honest by failing fast on errors that will never succeed.',
    related: ['src/types/index.ts'],
  },

  'src/utils/data.utils.ts': {
    group: 'utils',
    title: 'Test data generation',
    purpose:
      'Seeded, reproducible test data. `seedFaker` makes a run repeatable from the test title, and `generateUser` builds a complete person. Generate rather than hard-code: a suite whose fixtures say `alice@example.com` fails the second time it runs against a uniqueness constraint.',
    blocks: [
      {
        type: 'code',
        caption: 'Reproducible data, different per test',
        text: `const faker = seedFaker(testInfo.title);   // same title -> same data
const user  = generateUser(faker);         // a complete, valid person`,
      },
    ],
    changeWhen: [
      'Your domain needs generators (an account number with a checksum, a valid VAT id), or you find a new input that breaks things.',
    ],
    changeHow: [
      {
        text: 'Add the generator here so every test uses the same valid shape.',
        code: `export function generateIban(country = 'GB'): string {
  return \`\${country}\${faker.string.numeric(2)}\${faker.string.alpha({ length: 4, casing: 'upper' })}\${faker.string.numeric(14)}\`;
}`,
      },
    ],
    why: 'Generated data with unique markers is what lets parallel workers run the same test without colliding on a shared record — the most common cause of "passes alone, fails in parallel".',
    gotchas: [
      'The `testData` fixture seeds faker from the test title, so within a test the sequence is deterministic and reproducible on retry.',
    ],
    related: ['src/fixtures/base.fixture.ts'],
  },

  'src/utils/file.utils.ts': {
    group: 'utils',
    title: 'File and path helpers',
    purpose:
      'Creating a directory if it is missing, and resolving a path against the test-data directory so callers can pass a name relative to `src/data` instead of a relative path that depends on where the caller lives.',
    blocks: [
      {
        type: 'code',
        caption: 'The whole module',
        text: `ensureDir(config.paths.storage);              // used by auth.setup.ts
resolveDataPath('cases.json');                // -> <root>/src/data/cases.json`,
      },
      {
        type: 'p',
        text: 'This module used to carry readers for JSON, CSV, Excel and NDJSON, plus temporary-file and download-stabilising helpers. No test ever called any of them, so they were removed along with the `csv-parse` and `xlsx-populate` dependencies they pulled in.',
      },
    ],
    changeWhen: ['A test needs to read a data file, or needs a generated file on disk.'],
    changeHow: [
      {
        text: 'Add the reader here and route it through `resolveDataPath`, so a caller passes a name relative to `src/data` rather than a path relative to itself. Add it in the same change as the test that reads it, not before.',
      },
      {
        text: 'For size-boundary upload tests, generate the file at run time rather than committing a large binary.',
      },
    ],
  },

  'src/utils/string.utils.ts': {
    group: 'utils',
    title: 'String helpers',
    purpose:
      '`normalizeText` — collapses the whitespace the DOM inserts, so an assertion compares the text a person sees rather than the text the markup happens to contain. It is the single most-used helper in the framework: every component that reads text routes through it.',
    changeWhen: [
      'Your application formats values in a way the parsers do not handle — a different decimal separator, a suffix like "1.2k".',
    ],
    changeHow: [
      {
        text: 'Extend the parser here rather than in the assertion, so every test parses the same way.',
        code: `export function parseCompactNumber(value: string): number {
  const match = /^([\\d.]+)([km])$/i.exec(normalizeText(value));
  if (!match) return Number(normalizeText(value).replace(/[^\\d.-]/g, ''));
  return Number(match[1]) * (match[2].toLowerCase() === 'k' ? 1_000 : 1_000_000);
}`,
      },
    ],
    why: 'Rendered text carries non-breaking spaces, line breaks and indentation. Normalising once removes an entire class of confusing string-comparison failures.',
    related: ['src/core/base.component.ts', 'src/fixtures/custom-matchers.ts'],
  },

  'src/utils/date.utils.ts': {
    group: 'utils',
    title: 'Date helpers',
    purpose:
      '`toIsoDate` and `format` for writing dates into inputs and comparing them, and `humanizeDuration` for readable log and report output.',
    changeWhen: ['You need a token the formatter does not support, or timezone-aware handling.'],
    changeHow: [
      {
        text: "Add the token to the replacement map and to the regular expression in `format`. For timezone-sensitive assertions, freeze the clock with Playwright's own clock API instead of computing offsets.",
        code: `await page.clock.setFixedTime(new Date('2026-01-15T09:00:00Z'));`,
      },
    ],
    why: 'Tests that compute "today" against a live clock fail at midnight and on daylight-saving boundaries. Freezing the page clock makes date-dependent UI deterministic.',
    related: ['src/components/form/date-picker.ts'],
  },

  'src/utils/network.utils.ts': {
    group: 'utils',
    title: 'NetworkHelper',
    purpose:
      'The network control surface for a page or context: `mock` a response, `modifyResponse` to rewrite a real one, `abort` to simulate failure, `delay` to exercise loading states, block heavy assets or third-party trackers, capture and search requests, wait for a specific response, and toggle offline.',
    blocks: [
      {
        type: 'code',
        caption: 'Testing states that are hard to reproduce for real',
        text: `await network.mock('**/api/cart', { status: 500, body: { message: 'Server error' } });
await network.delay('**/api/search*', 3000);        // prove the spinner appears
await network.abort('**/api/recommendations');      // prove the page survives a dead widget
await network.setOffline(true);                     // offline banner`,
      },
    ],
    changeWhen: [
      'You need a new interception pattern — conditional mocking, recording to a fixture file, replaying a HAR.',
    ],
    changeHow: [
      {
        text: 'Add the method to the class so it is available through the `network` fixture everywhere.',
        code: `async mockOnce<T>(pattern: string | RegExp, response: MockResponse<T>): Promise<void> {
  await this.target.route(pattern, async (route) => {
    await route.fulfill({ status: response.status ?? 200, body: JSON.stringify(response.body) });
    await this.target.unroute(pattern);
  });
}`,
      },
    ],
    why: 'Error states, slow responses and third-party outages are extremely hard to reproduce against a real backend and trivial to reproduce here — which is what makes those paths testable at all.',
    gotchas: [
      'The `network` fixture resets routes after each test, so a mock cannot leak into the next one.',
      'Blocking third parties speeds runs and removes a large source of flakiness, but do not block them in tests whose purpose is the integration.',
    ],
    related: ['src/fixtures/base.fixture.ts', 'src/types/index.ts'],
  },

  'src/utils/browser.utils.ts': {
    group: 'utils',
    title: 'Console capture',
    purpose:
      'Console capture: `captureConsole` records console errors, uncaught exceptions and failed requests into a container the `consoleErrors` fixture owns, so a test can assert the page logged nothing unexpected.',
    blocks: [
      {
        type: 'code',
        caption: 'Assert the page logged nothing unexpected',
        text: `const capture = createConsoleCapture();   // the fixture owns the container
captureConsole(page, capture);            // it fills as the test runs

// ... drive the page ...
expect(capture.errors, capture.errors.join('\\n')).toEqual([]);`,
      },
    ],
    changeWhen: [
      'You need to record another signal from the page — a specific console channel, a resource-timing entry.',
    ],
    changeHow: [
      {
        text: 'Add the helper here and import it directly where it is needed. If every test needs it, promote it to a fixture instead.',
      },
    ],
    why: 'A page that throws in the console is usually broken even when the assertions pass. Capturing into a container the fixture owns means the check costs a test nothing to opt into.',
    gotchas: [
      '`captureConsole(page, into)` records into an existing container — that is how the `consoleErrors` fixture avoids depending on `page`.',
    ],
    related: ['src/fixtures/base.fixture.ts'],
  },

  'src/utils/a11y.utils.ts': {
    group: 'utils',
    title: 'Accessibility scanning',
    purpose:
      'Runs axe-core against a page or a subtree, attaches both a JSON and an HTML report to the test result, formats violations into a readable failure message, and fails the test by default when violations are found.',
    blocks: [
      {
        type: 'code',
        caption: 'Scoping a scan',
        text: `await scanAccessibility(page, {
  include: ['main'],
  exclude: ['#third-party-widget'],
  tags: ['wcag2a', 'wcag2aa'],
  disableRules: ['color-contrast'],   // temporary, with a ticket
});`,
      },
    ],
    changeWhen: [
      'You change the WCAG level you hold yourself to, need to exclude a third-party region, or want a different report format.',
    ],
    changeHow: [
      {
        text: 'Change `DEFAULT_WCAG_TAGS` to raise or lower the bar for the whole suite.',
        code: `export const DEFAULT_WCAG_TAGS: WcagTag[] = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];`,
      },
      {
        text: 'Disable a rule only with a linked ticket and a date, so the exception is temporary by construction.',
      },
    ],
    why: '`failOnViolation` defaults to true on purpose: accessibility regressions should break the build, not accumulate in a report nobody opens.',
    related: ['src/fixtures/custom-matchers.ts', 'src/core/base.page.ts'],
  },
  'src/data/README.md': {
    group: 'data',
    title: 'Test-data guidance',
    purpose:
      'Explains what belongs in the data directory: static fixtures only, with anything unique per run generated at runtime so parallel workers never collide. Also records the rule that credentials and production data never live here.',
    changeWhen: ['You add a data file or change the data conventions.'],
    changeHow: [
      {
        text: 'Add the file to the table with a one-line purpose so the directory stays self-describing.',
      },
    ],
    why: 'A data directory without rules becomes a graveyard of stale records that quietly couple unrelated tests to each other.',
    related: ['src/utils/file.utils.ts', 'src/utils/data.utils.ts'],
  },
  'tests/README.md': {
    group: 'tests',
    title: 'Test conventions',
    purpose:
      'The rules for writing specs: import from `@fixtures/index`, tag every test, one behaviour per test, no selectors in specs, seed state through the API, and never use `waitForTimeout`. Also documents the folder layout and naming.',
    changeWhen: ['A convention changes, or a new folder or tag is introduced.'],
    changeHow: [
      { text: 'Update the rule here and in the review checklist so the two never disagree.' },
    ],
    why: 'Conventions that live next to the code get read; conventions in a wiki do not.',
    related: ['src/fixtures/index.ts'],
  },

  'tests/ui/.gitkeep': {
    group: 'tests',
    title: 'Functional test folder',
    purpose:
      'Placeholder keeping `tests/ui/` in version control. Functional specs live here, mirroring the application’s feature areas.',
    changeWhen: ['You add your first spec — delete the placeholder then.'],
    changeHow: [
      { text: 'Create `tests/ui/<feature>/<feature>.spec.ts` and remove the `.gitkeep`.' },
    ],
    why: 'Mirroring feature areas keeps ownership obvious and makes `--grep` by path useful.',
    related: ['tests/README.md'],
  },

  'tests/visual/.gitkeep': {
    group: 'tests',
    title: 'Visual test folder',
    purpose:
      'Placeholder for the `visual` project’s specs. Baselines are written to `__screenshots__/<project>/` beside the spec.',
    changeWhen: ['You add a visual spec.'],
    changeHow: [
      {
        text: 'Add the spec here — the `visual` project is the only one that runs this folder, and every other project ignores it.',
      },
    ],
    why: 'Isolating visual tests keeps pixel comparison on one fixed rendering stack, where it is meaningful.',
    related: ['playwright.config.ts'],
  },

  'tests/a11y/.gitkeep': {
    group: 'tests',
    title: 'Accessibility test folder',
    purpose:
      'Placeholder for the `accessibility` project’s specs — axe scans across key pages and states.',
    changeWhen: ['You add an accessibility spec.'],
    changeHow: [
      {
        text: 'Scan meaningful states, not just the landing page: forms with errors showing, modals open, menus expanded.',
      },
    ],
    why: 'Most accessibility defects appear in interactive states, which a scan of the initial render never reaches.',
    related: ['src/utils/a11y.utils.ts'],
  },

  'README.md': {
    group: 'docs-existing',
    title: 'Project README',
    purpose:
      'The front door: quick start, the folder map, how a test looks, the command table, environment handling, reporting outputs and links to the deeper documentation.',
    changeWhen: ['A command, folder or workflow changes.'],
    changeHow: [
      {
        text: 'Keep it short and link outwards. Detail belongs in the generated documentation, which cannot drift from the code.',
      },
    ],
    why: 'A README that tries to be complete goes stale. A README that orients and links stays useful.',
    related: ['docs/ARCHITECTURE.md', 'docs/COMPONENTS.md'],
  },

  'docs/ARCHITECTURE.md': {
    group: 'docs-existing',
    title: 'Architecture notes (markdown)',
    purpose:
      'The concise markdown version of the design rationale, for reading on GitHub without building the documentation site.',
    changeWhen: ['A structural decision changes.'],
    changeHow: [
      {
        text: 'Update this file and the corresponding architecture page content in `scripts/docs/content/guides.mjs`.',
      },
    ],
    why: 'Reviewers read markdown in pull requests; the generated site is for reference. Keeping both is cheap when the content is short.',
    related: ['scripts/docs/content/'],
  },

  'docs/COMPONENTS.md': {
    group: 'docs-existing',
    title: 'Component reference (markdown)',
    purpose:
      'The markdown summary of every component and its key methods, for quick lookup in an editor or on GitHub.',
    changeWhen: ['You add or rename a component.'],
    changeHow: [
      {
        text: 'Add the row here and the entry in `scripts/docs/content/files.components-*.mjs`; the generated API surface updates itself.',
      },
    ],
    why: 'A one-screen table is the fastest way to answer "does the framework already have something for this?"',
  },
};
