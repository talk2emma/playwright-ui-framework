# Playwright UI Automation Framework

A production-grade TypeScript framework for testing **every kind of UI element**:
forms, tables and enterprise data grids, dropdowns, date pickers, modals, toasts,
tabs, trees, carousels, canvases, iframes, shadow DOM, rich-text editors,
drag-and-drop, infinite scroll and charts.

No tests are included — this is the foundation they sit on.

---

## What it runs against

The suite ships pointed at **[SecureBank](https://qaplayground.com/bank/login)** —
a real banking application published at qaplayground.com for automation
practice. No configuration and no credentials of your own are required:

```bash
npm ci
npx playwright install --with-deps
npm test          # 110 tests against a real application
```

**110 tests, all passing**, covering the application's own catalogue of 42 test
cases plus authentication, navigation, responsive behaviour, accessibility and
visual baselines. Three of them record real defects the suite found — a
keyboard-unreachable skip link, a dialog missing `aria-modal`, and three
unlabelled form controls — recorded with `test.fail()` so the run stays green
and turns red when they are fixed.

The application also ships a **planted defect**, which the suite reproduces:
for `error_user` the loan history total is short by exactly the newest loan.

See [`tests/README.md`](tests/README.md), or the **Worked example** chapter of
the documentation for a full walkthrough.

## Quick start

```bash
npm ci                      # install dependencies
npx playwright install --with-deps   # install browsers
cp .env.example .env        # then fill in BASE_URL and credentials

npm run validate            # typecheck + lint + format check
npm test                    # run the suite (once you have tests)
npm run test:ui             # interactive UI mode
```

Requires **Node 20, 22 or 24 (LTS)**. See `.nvmrc`.

## Layout

```
playwright-ui-framework/
├── playwright.config.ts        Projects, reporters, timeouts, artifacts
├── eslint.config.mjs           Type-aware linting (flat config)
├── src/
│   ├── config/                 Environment resolution, validated with zod
│   │   ├── env.config.ts       The ONLY place process.env is read
│   │   ├── environments.ts     Per-environment URLs (safe to commit)
│   │   └── timeouts.ts         Named timeout budgets
│   ├── core/                   Framework foundation
│   │   ├── base.component.ts   Every component inherits from this
│   │   ├── base.page.ts        Every page object inherits from this
│   │   └── locator.factory.ts  Selector resolution + locator strategies
│   ├── components/             The component library (see docs/COMPONENTS.md)
│   │   ├── form/  data/  navigation/  feedback/  media/  advanced/
│   │   └── component.factory.ts  `ui(page).table('#grid')`
│   ├── pages/                  Page objects (start from template.page.ts)
│   ├── fixtures/               The `test` and `expect` that tests import
│   ├── hooks/                  Global setup/teardown, auth session capture
│   ├── api/                    HTTP client for seeding test data
│   ├── utils/                  Logging, waits, network, files, a11y, visual
│   ├── reporters/              Custom run summary
│   ├── data/                   Static test data (JSON/CSV/XLSX)
│   └── types/                  Shared type definitions
├── tests/                      ui/ · visual/ · a11y/  (empty; see tests/README.md)
├── docs/                       Architecture and component reference
├── .github/workflows/          Sharded CI with merged reports
├── Dockerfile / docker-compose.yml   CI-identical local runs
└── Makefile                    Common commands
```

## How a test will look

```ts
import { test, expect } from '@fixtures/index';
import { CheckoutPage } from '@pages/checkout.page';

test('applies a discount code @smoke', async ({ page, ui }) => {
  const checkout = new CheckoutPage(page);
  await checkout.goto();

  await checkout.discountCode.type('SAVE20');
  await checkout.applyButton.clickAndWaitForCompletion();

  await expect(checkout.total).toHaveNormalizedText('$80.00');
  await checkout.lineItems.expectCount(3);
});
```

Tests import `test`/`expect` from `@fixtures/index`, never from `@playwright/test`.
That single rule is what gives every test the logger, component factory,
network control, console-error capture, deterministic data and custom matchers.

## Commands

| Command                                          | What it does                    |
| ------------------------------------------------ | ------------------------------- |
| `npm test`                                       | Full suite across all projects  |
| `npm run test:smoke`                             | Only `@smoke` tagged tests      |
| `npm run test:chromium` / `:firefox` / `:webkit` | One browser                     |
| `npm run test:mobile`                            | Pixel 7 + iPhone 14 emulation   |
| `npm run test:a11y`                              | axe-core accessibility suite    |
| `npm run test:visual`                            | Screenshot comparison suite     |
| `npm run test:visual:update`                     | Refresh visual baselines        |
| `npm run test:failed`                            | Re-run only last run's failures |
| `npm run test:ui` / `:debug`                     | Interactive / step debugger     |
| `npm run report`                                 | Open the HTML report            |
| `npm run validate`                               | Typecheck + lint + format check |
| `make help`                                      | List all Make targets           |

## Environments

`TEST_ENV` selects an entry from `src/config/environments.ts`
(`local` · `dev` · `qa` · `staging` · `prod`); `BASE_URL` overrides its URL.
Everything is validated at load time by zod, so a malformed variable fails
immediately with a readable message instead of a mystifying test failure.

```bash
TEST_ENV=staging npm test
BASE_URL=https://pr-123.preview.example.com npm run test:smoke
```

Credentials never live in the repo. They are read from the environment through
`getUser(role)`, which throws a specific error naming the missing variable.

## Reporting

Every run produces:

| Output      | Path                     | Purpose                                                  |
| ----------- | ------------------------ | -------------------------------------------------------- |
| HTML report | `reports/html`           | Human investigation, traces attached                     |
| Run summary | `reports/summary.json`   | Failures, flaky tests, slowest tests — for CI dashboards |
| JUnit XML   | `reports/junit`          | CI test-result integration                               |
| CTRF JSON   | `reports/ctrf`           | Standard cross-tool test format                          |
| Allure      | `reports/allure-results` | Enabled with `ALLURE_ENABLED=true`                       |

On failure the framework also attaches the page URL, a DOM snapshot, and any
console errors, page errors and failed requests recorded during the test.

## Documentation

The complete manual documents **every file in the repository** — what it does, when you
need to change it, how to change it and why the change belongs there — alongside an API
reference extracted directly from the source.

| Format      | Where                                            | Best for                                       |
| ----------- | ------------------------------------------------ | ---------------------------------------------- |
| HTML site   | `docs/site/index.html`                           | Browsing offline; 15 linked pages with search  |
| PDF         | `docs/playwright-ui-framework-documentation.pdf` | Printing, sharing, offline reading (247 pages) |
| Single page | `docs/site/print.html`                           | Everything in one scrollable page              |

```bash
npm run docs          # regenerate all three
npm run docs:open     # open the HTML site
```

The build **fails** if a repository file has no documentation entry, so the manual cannot
silently fall behind the code. Entries live in `scripts/docs/content/`.

Shorter markdown summaries are also kept for reading on GitHub:

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — how the layers fit together and why
- [docs/COMPONENTS.md](docs/COMPONENTS.md) — every component and its API
- [tests/README.md](tests/README.md) — conventions for writing tests
