/**
 * SecureBank page objects.
 *
 * Every page the suite drives is exported here, so the `pages` fixture and any
 * spec have one import path. Adding a page means one export and one line in
 * the fixture.
 */
export type { NavDestination } from './bank-shell';
export { LoginPage } from './login.page';
export { DashboardPage } from './dashboard.page';
export { AccountsPage } from './accounts.page';
export { AccountDetailPage } from './account-detail.page';
export { TransferPage } from './transfer.page';
export { SendMoneyPage } from './send-money.page';
export { BillPayPage } from './bill-pay.page';
export { TransactionsPage } from './transactions.page';
export { ApplyLoanPage } from './apply-loan.page';
export { NotificationsPage } from './notifications.page';
export { ProfilePage } from './profile.page';
