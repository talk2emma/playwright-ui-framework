/**
 * The SecureBank demo personas.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE CREDENTIALS ARE IN THE REPOSITORY
 * ---------------------------------------------------------------------------
 * The framework's rule is that credentials never enter version control, and
 * that rule is not being bent here. These are **published on the application's
 * own login page**, in a table headed "Test credentials", for anyone to read.
 * They authenticate nothing real and protect nothing.
 *
 * Treating them as secrets would mean every developer had to be handed a
 * `.env` before they could run a single test against a public practice app —
 * ceremony with no security benefit. The `getUser()` path in `env.config.ts`
 * remains the only way credentials reach the code for every other environment.
 *
 * ---------------------------------------------------------------------------
 * WHY THE PERSONAS MATTER MORE THAN THE PASSWORDS
 * ---------------------------------------------------------------------------
 * Each account behaves differently on purpose. That is what makes this app
 * worth automating: negative paths, degraded states and a planted defect are
 * all reachable by logging in as somebody else, rather than by mocking a
 * failure and hoping the mock resembles reality.
 */

/** The behaviours the application deliberately exhibits per account. */
export type PersonaTrait =
  /** Everything works. The happy path. */
  | 'full-access'
  /** Login is refused with a suspension message. */
  | 'locked'
  /** Signs in, but every money-movement control is disabled. */
  | 'frozen'
  /** Signs in with a negative balance and an overdraft indicator. */
  | 'overdraft'
  /** Signs in slowly — the loading states are real and worth asserting on. */
  | 'slow'
  /** Carries a planted defect: the loan history total omits the newest loan. */
  | 'planted-defect'
  /** Sees an additional administrative view. */
  | 'admin';

export interface Persona {
  readonly username: string;
  readonly password: string;
  /** What the application does differently for this account. */
  readonly trait: PersonaTrait;
  /** The wording the application itself uses, for cross-checking the fixture. */
  readonly description: string;
}

/**
 * Keyed by trait rather than by username, so a test reads as an intention —
 * `personas.frozen` — instead of as a lookup somebody has to decode.
 */
export const PERSONAS = {
  standard: {
    username: 'standard_user',
    password: 'bank_sauce',
    trait: 'full-access',
    description: 'Full access',
  },
  locked: {
    username: 'locked_user',
    password: 'bank_sauce',
    trait: 'locked',
    description: 'Locked account',
  },
  frozen: {
    username: 'frozen_user',
    password: 'bank_sauce',
    trait: 'frozen',
    description: 'Frozen — no transfers',
  },
  overdraft: {
    username: 'overdraft_user',
    password: 'bank_sauce',
    trait: 'overdraft',
    description: 'Negative balance',
  },
  slow: {
    username: 'slow_user',
    password: 'bank_sauce',
    trait: 'slow',
    description: 'Slow loading',
  },
  buggy: {
    username: 'error_user',
    password: 'bank_sauce',
    trait: 'planted-defect',
    description: 'Wrong loan total',
  },
  admin: {
    username: 'admin_user',
    password: 'admin_sauce',
    trait: 'admin',
    description: 'Admin view',
  },
} as const satisfies Record<string, Persona>;

export type PersonaName = keyof typeof PERSONAS;

/** Every persona, for the test that cross-checks this file against the app. */
export const ALL_PERSONAS: readonly Persona[] = Object.values(PERSONAS);

/**
 * Facts about the seeded dataset that tests assert against.
 *
 * Kept here rather than inline so that when the application reseeds, one file
 * changes instead of nine specs. Every value was read from the running
 * application, not from its documentation.
 */
export const SEED = {
  /** The signed-in display name for `standard_user`. */
  displayName: 'Alex',
  /** Accounts the standard persona starts with. */
  accounts: [
    { name: 'Everyday Checking', balance: 4250, id: 'acc-checking-1' },
    { name: 'High-Yield Savings', balance: 12800, id: 'acc-savings-1' },
  ],
  /** Sum of the above; shown on the dashboard as Total Net Worth. */
  netWorth: 17050,
  /** Rows the dashboard's "Recent Transactions" widget shows at most. */
  recentTransactionLimit: 5,
  /** Rows per page in the full transactions table. */
  transactionsPageSize: 10,
  /**
   * Total transactions across all accounts for the standard persona, in a
   * FRESH browser context.
   *
   * Worth spelling out: an earlier draft recorded 20, read from a session that
   * had already performed a transfer — every completed transfer adds a debit
   * and a matching credit. Seed values must be read from a clean context, or
   * they encode whatever the person exploring happened to do first.
   */
  totalTransactions: 18,
  /** Rows per page in the loan history table. */
  loanHistoryPageSize: 5,
  /** Unread notifications a fresh session starts with. */
  unreadNotifications: 2,
  /** The application refuses loan applications above this amount. */
  maximumLoanAmount: 250_000,
} as const;
