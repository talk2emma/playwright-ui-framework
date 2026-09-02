import { BasePage } from '../../core/base.page';
import { ui, type UiFactory } from '../../components/component.factory';
import { BankShell } from './bank-shell';
import type { Page } from '@playwright/test';
import type { Link } from '../../components/navigation/link';
import type { SelectorLike } from '../../types';

/** The landing page after sign-in: net-worth cards, quick actions, recent activity. */
export class DashboardPage extends BasePage {
  protected readonly path = '/bank/dashboard';
  protected readonly readyIndicator: SelectorLike = '[data-testid="bank-dashboard-page"]';

  private readonly factory: UiFactory;
  readonly shell: BankShell;

  readonly welcomeMessage;
  readonly statCards;
  readonly netWorthValue;
  readonly quickActions;
  readonly recentTransactions;
  readonly viewAllTransactionsButton;

  constructor(page: Page) {
    super(page);
    this.factory = ui(page);
    this.shell = new BankShell(page);

    this.welcomeMessage = this.factory.card('[data-testid="dashboard-welcome-message"]', {
      name: 'Welcome message',
    });
    this.statCards = this.factory.list('[data-testid="dashboard-stat-cards"]', {
      name: 'Stat cards',
      itemSelector: '[data-testid="stat-card"]',
    });
    this.netWorthValue = this.factory.card('[data-testid="stat-card-net-worth-value"]', {
      name: 'Total net worth',
    });
    this.quickActions = this.factory.card('[data-testid="quick-actions-section"]', {
      name: 'Quick actions',
    });
    /* The recent-activity widget. Modelled as a Table so row access, column
     * lookup and sorting all come from the component rather than from ad-hoc
     * locators in each test. */
    this.recentTransactions = this.factory.table('[data-testid="recent-transactions-table"]', {
      name: 'Recent transactions',
      rowSelector: '[data-testid="recent-txn-row"]',
    });
    this.viewAllTransactionsButton = this.factory.link(
      '[data-testid="view-all-transactions-btn"]',
      { name: 'View all transactions' },
    );
  }

  /** A quick-action tile, by the slug the application uses. */
  quickAction(action: QuickAction): Link {
    return this.factory.link(`[data-testid="quick-action-${action}"]`, {
      name: `Quick action: ${action}`,
    });
  }

  /** Clicks a quick action and waits for its destination. */
  async useQuickAction(action: QuickAction): Promise<void> {
    await this.quickAction(action).clickAndWait(new RegExp(`/bank/${action}$`));
  }

  /**
   * The Total Net Worth figure, as a number.
   *
   * Currency parsing lives here rather than in each test: `$17,050.00` has a
   * symbol, a thousands separator and two decimals, and re-deriving that regex
   * in nine specs is nine chances to get it subtly wrong.
   */
  async netWorth(): Promise<number> {
    return parseCurrency(await this.netWorthValue.getText());
  }

  /** Every stat card's label and value, in display order. */
  async stats(): Promise<{ label: string; value: string }[]> {
    const cards = this.page.locator('[data-testid="stat-card"]');
    const count = await cards.count();
    const out: { label: string; value: string }[] = [];

    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const text = (await card.innerText())
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      out.push({ label: text[0] ?? '', value: text[1] ?? '' });
    }
    return out;
  }
}

export type QuickAction = 'transfer' | 'send-money' | 'bill-pay' | 'apply-loan' | 'transactions';

/**
 * Turns a displayed money string into a number.
 *
 * Exported because six page objects need it and the alternative is six
 * slightly different regexes. Handles the leading sign the application uses on
 * credits and debits (`+$3,200.00`, `-$87.43`) and parenthesised negatives.
 */
export function parseCurrency(text: string): number {
  const negative = /^\(.*\)$/.test(text.trim()) || text.includes('-');
  const digits = text.replace(/[^0-9.]/g, '');
  const value = Number(digits);
  if (Number.isNaN(value)) throw new Error(`Could not read a currency value from "${text}".`);
  return negative ? -value : value;
}
