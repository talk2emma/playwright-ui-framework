import { type EnvironmentConfig, type EnvironmentName } from '../types';

/**
 * Static, non-secret configuration per environment.
 *
 * Secrets never live here — they come from the process environment (see
 * `env.config.ts`). This file is safe to commit and is the single source of
 * truth for "where does a given environment live".
 */
const ENVIRONMENTS: Record<EnvironmentName, EnvironmentConfig> = {
  /**
   * The default target: **SecureBank**, a real banking application published
   * at qaplayground.com specifically for automation practice.
   *
   * It is the default so that a fresh clone can run `npm test` and get a
   * meaningful result before anyone has configured anything. A UI framework
   * that cannot demonstrate itself against a real application is a framework
   * nobody can evaluate.
   *
   * Three properties make it unusually good to test against, and they are the
   * reason the suite is shaped the way it is:
   *
   *  1. **Thorough `data-testid` coverage.** Almost every meaningful element
   *     carries one, which is why `testIdAttribute: 'data-testid'` in
   *     `playwright.config.ts` does so much work here.
   *  2. **State lives in `localStorage`** (key `bank-app-v4`), and Playwright
   *     gives every test a fresh browser context — so tests are isolated by
   *     construction, with no cleanup step and no shared-account collisions.
   *  3. **Seven personas with deliberately different behaviour**, including a
   *     locked account, a frozen account and one with a planted defect. That
   *     turns negative-path testing from an exercise into something real.
   */
  demo: {
    name: 'demo',
    baseURL: 'https://qaplayground.com',
    apiBaseURL: 'https://qaplayground.com',
    /* One retry: it is a public site on shared infrastructure, and the
     * occasional cold start is not a defect in the application. */
    retries: 1,
    workers: undefined,
    ignoreHTTPSErrors: false,
  },
  local: {
    name: 'local',
    baseURL: 'http://localhost:3000',
    apiBaseURL: 'http://localhost:3000/api',
    retries: 0,
    workers: undefined,
    ignoreHTTPSErrors: true,
  },
  dev: {
    name: 'dev',
    baseURL: 'https://dev.example.com',
    apiBaseURL: 'https://dev.example.com/api',
    retries: 1,
    workers: undefined,
    ignoreHTTPSErrors: true,
  },
  qa: {
    name: 'qa',
    baseURL: 'https://qa.example.com',
    apiBaseURL: 'https://qa.example.com/api',
    retries: 1,
    workers: undefined,
    ignoreHTTPSErrors: false,
  },
  staging: {
    name: 'staging',
    baseURL: 'https://staging.example.com',
    apiBaseURL: 'https://staging.example.com/api',
    retries: 2,
    workers: 4,
    ignoreHTTPSErrors: false,
  },
  prod: {
    name: 'prod',
    baseURL: 'https://www.example.com',
    apiBaseURL: 'https://www.example.com/api',
    retries: 2,
    workers: 2,
    ignoreHTTPSErrors: false,
  },
};

export function getEnvironment(name: EnvironmentName): EnvironmentConfig {
  const environment = ENVIRONMENTS[name];
  if (!environment) {
    throw new Error(
      `Unknown environment "${name}". Valid values: ${Object.keys(ENVIRONMENTS).join(', ')}`,
    );
  }
  return environment;
}
