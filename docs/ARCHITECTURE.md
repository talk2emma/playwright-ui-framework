# Architecture

## The layering rule

```
tests/          What the business cares about. No selectors, no waits.
   ↓ calls
src/pages/      Page objects: URL, ready state, business actions.
   ↓ composed of
src/components/ Element behaviour: how a table sorts, how a dropdown opens.
   ↓ built on
src/core/       BaseComponent / BasePage: logging, steps, waits, diagnostics.
   ↓ uses
src/utils/      Cross-cutting: logging, network, files, a11y, visual, data.
src/config/     Validated environment configuration.
```

Each layer may only reach _downwards_. A component must never know which page
it is on; a page must never know which test is running.

## Why a component layer at all

Most Playwright suites put selectors in page objects and call raw locator
methods from there. That works until the twentieth table, at which point every
page object contains its own slightly different "read all rows" loop, and a
change in the grid library means editing twenty files.

Here, `Table` knows how to read rows by column _name_, sort, filter, select and
verify ordering — once. `DataGrid` extends it with the three things virtualised
grids add: async loading, rows that only exist while scrolled into view, and
inline editing. A page object is then a short, declarative list of components:

```ts
readonly results = this.factory.dataGrid('[data-testid="results"]', { name: 'Results' });
```

## BaseComponent: what every element gets for free

`src/core/base.component.ts` is the single most important file in the
framework. Because every component extends it, these behaviours are uniform
and free:

- **Reported steps.** Each action runs inside `test.step`, so a trace reads
  `Table "Results": sort by "Amount" desc` instead of an anonymous click.
- **Contextual failures.** An error names the component, its selector and the
  original cause — not just "locator not found".
- **Pre-action hygiene.** Visibility wait, scroll into view, optional geometric
  stability wait, all before every interaction.
- **State inspection.** `getState()` returns visibility, enablement, checked
  state, focus, text, value, box and every attribute in one call — the single
  most useful thing to have when a test fails at 3am.
- **Named assertions.** `expectVisible()`, `expectText()`, `expectCount()` wrap
  web-first assertions with messages that identify the component.

Adding a new element type means extending `BaseComponent` and writing only the
behaviour unique to that element.

## Locator resolution

`resolveLocator()` accepts a CSS/XPath string, an existing `Locator`, or a
function that derives one from a scope — and applies the iframe and shadow-DOM
options a component declares. That is why an iframe needs no special handling
anywhere else:

```ts
const frame = new Frame(page, '#payment');
const cardNumber = new TextInput(frame.locator, '#card-number'); // same API
```

The `by` object in `locator.factory.ts` documents the preferred strategies in
order of resilience: test id → role → label → placeholder → text → CSS → XPath.

## Fixtures: the framework's entry point

`src/fixtures/` composes the `test` object every spec imports:

| Fixture                             | Provides                                          |
| ----------------------------------- | ------------------------------------------------- |
| `ui`                                | Component factory bound to the page               |
| `log`                               | Logger scoped to the test title                   |
| `network`                           | Mocking, latency, offline, request capture        |
| `consoleErrors`                     | Console errors, page errors, failed requests      |
| `testData`                          | Generated user data, seeded from the test title   |
| `api` (worker)                      | HTTP client for seeding state                     |
| `userFor`                           | Credentials for a role                            |
| `failOnConsoleErrors`               | Opt-in policy that fails a test on console errors |
| `authenticatedPage`, `pageAs(role)` | Sessions replayed from storage state              |

Two design details worth knowing:

1. **`testData` is seeded from the test title.** A retry regenerates the _same_
   data as the original attempt, so retries reproduce rather than mask failures.
2. **The `page` fixture is overridden**, not replaced. It attaches console
   listeners on the way in, and on the way out — only when the test failed —
   attaches the URL, a DOM snapshot and captured browser errors.

## Authentication

Logging in through the UI once per test is the most common reason a suite is
slow. `src/hooks/auth.setup.ts` runs as the `setup` project, signs in once per
role and saves `storage/<role>.json`; every other project depends on it and
starts already authenticated. `auth.setup.ts` is the only file in the framework
that knows your login markup — adapt its `signIn` function and nothing else.

## Configuration

`src/config/env.config.ts` is the only file permitted to read `process.env`.
It loads `.env`, then `.env.<TEST_ENV>`, validates everything with zod, and
exports one frozen `config` object. A typo in a CI variable therefore fails at
startup with a precise message rather than silently pointing a production-data
test at the wrong host.

Timeouts are named budgets in `timeouts.ts` (`SHORT`, `MEDIUM`, `LONG`, …), so
tuning flakiness is one file, not a repo-wide search for magic numbers.

## Projects

`playwright.config.ts` defines eleven projects: a `setup` project that captures
sessions; desktop Chromium, Firefox, WebKit and Edge; Pixel, iPhone and iPad
emulation; a dark-mode pass; and two specialised suites — `visual` (pinned to a
fixed viewport and browser, because pixel comparison across rendering stacks is
meaningless) and `accessibility`.

## Reporting and diagnostics

Beyond Playwright's HTML report, `src/reporters/summary.reporter.ts` emits
`reports/summary.json` containing failures, flaky tests and the five slowest
tests — the data a CI dashboard or PR comment actually needs, without unzipping
an HTML bundle.

## Deliberate constraints

- **No `waitForTimeout` in test code.** Waits belong in components, expressed as
  conditions.
- **No selectors above the component layer.**
- **No `process.env` outside `env.config.ts`.**
- **No business assertions inside page objects.**
- **Test data is generated or API-seeded**, never hand-maintained rows that
  parallel workers can collide on.
