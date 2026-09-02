/**
 * The single import surface for tests:
 *
 *   import { test, expect } from '@fixtures/index';
 *
 * This re-export is what guarantees every test gets the framework's fixtures
 * and custom matchers instead of the bare Playwright ones.
 */
/*
 * `test` comes from the bank fixture, which extends the auth fixture, which
 * extends the base one. Each layer adds fixtures without the layer below
 * knowing about it, so a project that deletes the bank suite loses nothing
 * else.
 */
export { test } from './bank.fixture';
export { expect } from './custom-matchers';
export type { TestFixtures, WorkerFixtures } from './base.fixture';
export type { AuthFixtures } from './auth.fixture';
export { storageStateFor } from './auth.fixture';
export type { BankFixtures, BankPages } from './bank.fixture';
