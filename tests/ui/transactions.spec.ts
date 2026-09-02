/**
 * ===========================================================================
 * Transactions — covers TC-TXN-001..006
 * ===========================================================================
 *
 * The richest page in the application: search, an account filter, a segmented
 * type filter, three sortable columns, pagination and a CSV export. It
 * exercises more of the component library than anything else in the suite.
 */
import { test, expect } from '../../src/fixtures';
import { SEED } from '../../src/data/personas';

/** Whether a list of numbers is ascending or descending. */
function directionOf(values: number[]): 'asc' | 'desc' {
  return values.join() === [...values].sort((a, b) => a - b).join() ? 'asc' : 'desc';
}

test.describe('transactions @regression @transactions', () => {
  test.beforeEach(async ({ signedIn }) => {
    await signedIn.transactions.goto();
    await signedIn.transactions.expectLoaded();
  });

  test('TC-TXN-001 — the page loads a first page of activity @smoke', async ({ signedIn }) => {
    const state = await signedIn.transactions.paginationState();

    expect(state.from).toBe(1);
    expect(state.to).toBe(SEED.transactionsPageSize);
    expect(state.total).toBe(SEED.totalTransactions);

    /* The rendered row count must agree with what the pagination claims —
     * a mismatch is the classic off-by-one in a paginated table. */
    expect(await signedIn.transactions.table.rowCount()).toBe(state.to - state.from + 1);
  });

  test('TC-TXN-003 — search narrows the list to matching rows', async ({ signedIn }) => {
    const before = await signedIn.transactions.descriptions();
    expect(before.length).toBeGreaterThan(0);

    /* The term is taken from the data itself, so the test does not depend on
     * a description somebody typed into it that may not exist tomorrow. */
    const term = (before[0] ?? '').split(' ')[0] ?? '';
    await signedIn.transactions.search(term);

    const after = await signedIn.transactions.descriptions();
    expect(after.length).toBeGreaterThan(0);
    expect(after.length).toBeLessThanOrEqual(before.length);
    expect(
      after.every((description) => description.toLowerCase().includes(term.toLowerCase())),
      'every remaining row must match the search term',
    ).toBe(true);
  });

  test('TC-TXN-006 — a search with no matches shows an empty state @negative', async ({
    signedIn,
  }) => {
    await signedIn.transactions.search('zzz-no-such-transaction-zzz');

    expect(await signedIn.transactions.isEmpty()).toBe(true);
    expect(await signedIn.transactions.table.rowCount()).toBe(0);

    /*
     * An empty state must *say* something. A table that simply renders zero
     * rows looks identical to one that failed to load, and the user cannot
     * tell which happened.
     */
    await expect(signedIn.transactions.emptyMessage.locator).toContainText(/no transactions/i);
  });

  test('TC-TXN-002 — filtering by account narrows the results', async ({ signedIn }) => {
    const before = await signedIn.transactions.table.rowCount();

    await signedIn.transactions.accountFilter.selectOption(SEED.accounts[0].name);

    const state = await signedIn.transactions.paginationState();
    /* Filtering to one of two accounts must reduce the total; if it did not,
     * the filter is decorative. */
    expect(state.total).toBeLessThan(SEED.totalTransactions);
    expect(await signedIn.transactions.table.rowCount()).toBeLessThanOrEqual(before);
  });

  test('TC-TXN-004 — the amount column sorts and reverses', async ({ signedIn }) => {
    await signedIn.transactions.sortBy('amount');
    const first = await signedIn.transactions.amounts();

    /*
     * The assertion is that the column IS sorted — not which way it sorts
     * first. Whether a column opens ascending or descending is a design
     * choice, and this application chooses descending; pinning the direction
     * would make the test a restatement of that choice rather than a check
     * that sorting works.
     *
     * Compared against a sorted copy rather than against hard-coded values, so
     * the assertion is about ordering rather than about the dataset.
     */
    const ascending = [...first].sort((a, b) => a - b);
    const descending = [...first].sort((a, b) => b - a);
    expect(
      first.join() === ascending.join() || first.join() === descending.join(),
      'the amount column must be sorted after one click',
    ).toBe(true);

    await signedIn.transactions.sortBy('amount');
    const second = await signedIn.transactions.amounts();

    /* Still sorted… */
    const secondAscending = [...second].sort((a, b) => a - b);
    const secondDescending = [...second].sort((a, b) => b - a);
    expect(
      second.join() === secondAscending.join() || second.join() === secondDescending.join(),
    ).toBe(true);

    /*
     * …and sorted the OTHER way.
     *
     * Note what this deliberately does not assert: that the second page is the
     * reverse of the first. Sorting applies to all 18 transactions while only
     * 10 are shown, so descending page 1 holds the largest ten and ascending
     * page 1 holds the smallest ten — two different slices, not a reversal.
     * An earlier draft asserted `second === first.reverse()` and failed
     * against entirely correct behaviour.
     *
     * Comparing the *directions* is the assertion that actually catches a sort
     * control which ignores the second click.
     */
    expect(directionOf(second), 'the second click must reverse the direction').not.toBe(
      directionOf(first),
    );
  });

  test('TC-TXN-005 — pagination moves forward and back', async ({ signedIn }) => {
    const firstPage = await signedIn.transactions.descriptions();
    const initial = await signedIn.transactions.paginationState();

    await signedIn.transactions.nextPageButton.click();
    await signedIn.transactions.waitForIdle();

    const second = await signedIn.transactions.paginationState();
    expect(second.from).toBe(initial.to + 1);

    const secondPage = await signedIn.transactions.descriptions();
    /* Different content, not merely a different page number — a paginator
     * that updates its label without changing the rows is a real defect. */
    expect(secondPage).not.toEqual(firstPage);

    await signedIn.transactions.previousPageButton.click();
    await signedIn.transactions.waitForIdle();

    expect(await signedIn.transactions.descriptions()).toEqual(firstPage);
  });

  test('the previous control is unavailable on the first page', async ({ signedIn }) => {
    /* A boundary a user meets immediately, and one that is easy to get wrong
     * in either direction: enabled-but-inert, or missing entirely. */
    await expect(signedIn.transactions.previousPageButton.locator).toBeDisabled();
  });

  test('the type filter restricts rows to credits or debits', async ({ signedIn }) => {
    /* The control is a segmented `div[role="group"]` of buttons rather than
     * native radios, so it is driven by clicking the visible option. */
    await signedIn.transactions.page.getByRole('button', { name: 'Credits', exact: true }).click();
    await signedIn.transactions.waitForIdle();

    const credits = await signedIn.transactions.amounts();
    expect(credits.length).toBeGreaterThan(0);
    expect(
      credits.every((amount) => amount > 0),
      'credits must all be positive',
    ).toBe(true);

    await signedIn.transactions.page.getByRole('button', { name: 'Debits', exact: true }).click();
    await signedIn.transactions.waitForIdle();

    const debits = await signedIn.transactions.amounts();
    expect(debits.length).toBeGreaterThan(0);
    expect(
      debits.every((amount) => amount < 0),
      'debits must all be negative',
    ).toBe(true);
  });

  test('the CSV export downloads a file @slow', async ({ signedIn }) => {
    /*
     * A download is one of the few browser interactions with no DOM to assert
     * on, so Playwright's download event is the only way to prove it happened.
     * Asserting the filename and that the body is non-empty is what
     * distinguishes a working export from a button that fires and does
     * nothing.
     */
    const downloadPromise = signedIn.transactions.page.waitForEvent('download');
    await signedIn.transactions.downloadButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.csv$/i);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const csv = Buffer.concat(chunks).toString('utf8');

    expect(csv.length).toBeGreaterThan(0);
    /* A header row plus at least one transaction. */
    expect(csv.split('\n').filter(Boolean).length).toBeGreaterThan(1);
  });
});
