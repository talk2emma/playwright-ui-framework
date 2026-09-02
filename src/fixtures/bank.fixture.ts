/**
 * SecureBank fixtures: ready-made page objects, and a signed-in session.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO CLEANUP HERE
 * ---------------------------------------------------------------------------
 * The application keeps all of its state in `localStorage` under `bank-app-v4`,
 * and Playwright gives every test a **fresh browser context**. So every test
 * starts from the seeded dataset automatically: no cleanup step, no shared
 * account to fight over, no ordering constraints.
 *
 * That is worth stating explicitly, because it is the reason this suite can
 * run fully parallel against a single shared demo application — something that
 * is normally the hardest problem in UI automation.
 *
 * ---------------------------------------------------------------------------
 * WHY SIGN-IN IS A FIXTURE AND NOT A `beforeEach`
 * ---------------------------------------------------------------------------
 * A fixture is constructed only when a test names it, so the login-page specs
 * — which must start signed *out* — simply do not ask for `signedIn` and pay
 * nothing. A `beforeEach` would run for them too and would have to be skipped
 * around.
 */
import { test as base } from './auth.fixture';
import {
  AccountDetailPage,
  AccountsPage,
  ApplyLoanPage,
  BillPayPage,
  DashboardPage,
  LoginPage,
  NotificationsPage,
  ProfilePage,
  SendMoneyPage,
  TransactionsPage,
  TransferPage,
} from '../pages/bank';
import { PERSONAS, type Persona, type PersonaName } from '../data/personas';

/** Every page object, constructed against the current page. */
export interface BankPages {
  readonly login: LoginPage;
  readonly dashboard: DashboardPage;
  readonly accounts: AccountsPage;
  readonly accountDetail: AccountDetailPage;
  readonly transfer: TransferPage;
  readonly sendMoney: SendMoneyPage;
  readonly billPay: BillPayPage;
  readonly transactions: TransactionsPage;
  readonly applyLoan: ApplyLoanPage;
  readonly notifications: NotificationsPage;
  readonly profile: ProfilePage;
}

export interface BankFixtures {
  /** All page objects. Construction is cheap — they only build locators. */
  bank: BankPages;
  /**
   * Signs in as the standard persona before the test body runs, leaving the
   * browser on the dashboard.
   */
  signedIn: BankPages;
  /** Signs in as any persona and returns the page objects. */
  signInAs: (persona: PersonaName | Persona) => Promise<BankPages>;
}

export const test = base.extend<BankFixtures>({
  bank: async ({ page }, use) => {
    await use({
      login: new LoginPage(page),
      dashboard: new DashboardPage(page),
      accounts: new AccountsPage(page),
      accountDetail: new AccountDetailPage(page),
      transfer: new TransferPage(page),
      sendMoney: new SendMoneyPage(page),
      billPay: new BillPayPage(page),
      transactions: new TransactionsPage(page),
      applyLoan: new ApplyLoanPage(page),
      notifications: new NotificationsPage(page),
      profile: new ProfilePage(page),
    });
  },

  signInAs: async ({ bank }, use) => {
    await use(async (persona) => {
      const resolved = typeof persona === 'string' ? PERSONAS[persona] : persona;
      await bank.login.goto();
      await bank.login.signInSuccessfully(resolved);
      return bank;
    });
  },

  signedIn: async ({ signInAs }, use) => {
    await use(await signInAs('standard'));
  },
});

export { expect } from './custom-matchers';
