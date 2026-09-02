# Tests

The suite runs against **[SecureBank](https://qaplayground.com/bank/login)** — a
real banking application published at qaplayground.com for automation practice.
Nothing is mocked, and no configuration is needed.

```bash
npm ci
npx playwright install --with-deps
npm test
```

**110 tests, all passing.** Three of them record real defects the suite found.

## Why this application

| Property                                | Why it matters                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Thorough `data-testid` coverage         | Which is why `testIdAttribute: 'data-testid'` does so much work here                                            |
| State lives in `localStorage`           | Playwright gives every test a fresh context, so tests are isolated by construction — no cleanup, fully parallel |
| Seven personas with different behaviour | Locked, frozen, overdrawn, slow, and one carrying a planted defect. Negative paths are one login away           |
| It publishes its own test catalogue     | 42 intended cases at `/bank/test-cases`; each spec names the case it satisfies                                  |

Credentials are in [`src/data/personas.ts`](../src/data/personas.ts). They are
**published on the application's own login page** and protect nothing — see the
comment at the top of that file for why they are not treated as secrets.

## Layout

| Folder          | Project                                         | Contains                                     |
| --------------- | ----------------------------------------------- | -------------------------------------------- |
| `tests/ui/`     | `chromium`, `firefox`, `webkit`, mobile, tablet | Functional behaviour across nine specs       |
| `tests/a11y/`   | `accessibility`                                 | axe scans across ten pages and both themes   |
| `tests/visual/` | `visual`                                        | Masked, component-level screenshot baselines |

## The specs

| Spec                          | Tests | Covers                                                                                 |
| ----------------------------- | ----- | -------------------------------------------------------------------------------------- |
| `ui/login.spec.ts`            | 11    | Sign-in, refusal messages, password visibility, remember-me, a fixture-integrity check |
| `ui/dashboard.spec.ts`        | 8     | TC-DASH-001..006, stat cards, every quick action                                       |
| `ui/navigation.spec.ts`       | 15    | Ten destinations, brand link, unread badge, responsive drawer, the skip link           |
| `ui/accounts.spec.ts`         | 12    | TC-ACC-001..006 across three personas, the dialog, the detail page                     |
| `ui/transfer.spec.ts`         | 12    | TC-XFER-001..006, cancellation, the frozen block                                       |
| `ui/transactions.spec.ts`     | 11    | TC-TXN-001..006, the type filter, the CSV export                                       |
| `ui/money-movement.spec.ts`   | 11    | TC-SEND-001..006 and TC-BILL-001..006                                                  |
| `ui/apply-loan.spec.ts`       | 9     | TC-LOAN-001..006 including the planted defect                                          |
| `ui/account-settings.spec.ts` | 11    | Notifications and profile                                                              |
| `a11y/bank.a11y.spec.ts`      | 15    | axe across ten pages and both themes                                                   |
| `visual/bank.visual.spec.ts`  | 7     | Login, stat cards, sidebar in both themes, transfer form, empty state                  |

## What the suite found

Three defects, all verified by hand, none of them failing the build. They are
recorded with `test.fail()` so the expectation survives, the run stays green,
and the test turns **red** the moment somebody fixes it.

| Finding                                         | Standard   | Where                    |
| ----------------------------------------------- | ---------- | ------------------------ |
| The skip link is unreachable by keyboard        | WCAG 2.4.1 | `ui/navigation.spec.ts`  |
| The account dialog omits `aria-modal`           | WAI-ARIA   | `ui/accounts.spec.ts`    |
| Three transfer controls have no accessible name | WCAG 4.1.2 | `a11y/bank.a11y.spec.ts` |

Plus the application's **planted defect**: for `error_user` the loan history
total shows $24,300 where the active and pending loans sum to $39,300 — short
by exactly the newest $15,000 loan. Reproduced in `ui/apply-loan.spec.ts`, with
a control test proving the same comparison passes for a healthy account.

Two recurring accessibility violations — `color-contrast` on four pages and
`aria-prohibited-attr` on one — are **baselined** in `a11y/bank.a11y.spec.ts`
rather than annotated, so any _new_ violation still fails the build.

## Conventions

**Import from `../../src/fixtures`, never from `@playwright/test`.** The
Playwright `test` has none of the page objects, fixtures or custom matchers,
and nothing will tell you.

```ts
import { test, expect } from '../../src/fixtures';
```

**Three levels of access:**

```ts
test('…', async ({ bank }) => { … });      // page objects, signed out
test('…', async ({ signedIn }) => { … });  // signed in as the standard persona
test('…', async ({ signInAs }) => {        // signed in as anyone
  const app = await signInAs('frozen');
});
```

**Tag every test** with a suite tag and a domain tag.

| Tag                                  | Means                                            |
| ------------------------------------ | ------------------------------------------------ |
| `@smoke`                             | Must pass before a deploy                        |
| `@regression`                        | The main body of the suite                       |
| `@negative`                          | A refusal, a validation, a blocked state         |
| `@a11y`                              | Accessibility                                    |
| `@visual`                            | Screenshot comparison                            |
| `@known-issue`                       | A documented defect, recorded with `test.fail()` |
| `@slow`                              | Legitimately slow; excluded from the fast loop   |
| `@auth`, `@transfer`, `@accounts`, … | The domain area                                  |

```bash
npx playwright test --grep @smoke
npx playwright test --grep-invert "@slow|@visual"
npx playwright test --project=accessibility
npm run test:visual:update            # refresh baselines, deliberately
```

**Assert behaviour, not markup.** A selector in a spec is a defect waiting to
happen — put it in the page object.

**Never sleep.** Use `waitFor` from `src/utils/`, or a page-object method that
waits for the thing you actually care about.

## Naming

`<area>.spec.ts` under the folder matching its project. The name should make
obvious which page object the spec exercises.
