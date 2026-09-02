/**
 * Centralised timeout budget (milliseconds).
 *
 * Every wait in the framework must reference one of these named budgets so that
 * tuning flakiness is a single-file change rather than a repo-wide grep.
 */
export const TIMEOUTS = {
  /** UI transition — a class toggle, a fade, a ripple. */
  INSTANT: 1_000,
  /** Micro-interaction — tooltip, dropdown open, toast appearance. */
  SHORT: 5_000,
  /** Default for any element interaction. */
  MEDIUM: 15_000,
  /** Page navigation, route change, heavy client-side render. */
  LONG: 30_000,
  /** File upload/download, report generation, batch job. */
  EXTRA_LONG: 60_000,
  /** Whole-test budget. */
  TEST: 60_000,
  /** Hook (beforeAll/afterAll) budget. */
  HOOK: 90_000,
  /** assertion polling budget. */
  EXPECT: 10_000,
  /** Poll interval used by custom wait helpers. */
  POLL_INTERVAL: 250,
  /** Debounce settle time for search/autocomplete inputs. */
  DEBOUNCE: 500,
  /** Animation settle time before a visual comparison. */
  ANIMATION: 300,
} as const;
