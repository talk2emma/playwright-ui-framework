import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { z } from 'zod';
import { getEnvironment } from './environments';
import { TIMEOUTS } from './timeouts';
import type { EnvironmentConfig, TestUser, UserRole } from '../types';

const ROOT_DIR = process.cwd();

/**
 * Loads `.env` then `.env.<TEST_ENV>`, with the environment-specific file
 * taking precedence. Real process env always wins over both, so CI secrets
 * never get clobbered by a stray local file.
 */
function loadDotEnvFiles(): void {
  const baseFile = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(baseFile)) {
    dotenv.config({ path: baseFile, quiet: true });
  }
  const envName = process.env.TEST_ENV ?? 'dev';
  const envFile = path.join(ROOT_DIR, `.env.${envName}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true, quiet: true });
  }
}

loadDotEnvFiles();

/**
 * Environment variables arrive as strings (or missing entirely), so each
 * schema entry pre-processes the raw value into the type the framework wants
 * and falls back to a documented default rather than throwing.
 */
/** Environment values are always strings or absent; anything else is a bug. */
function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function booleanish(fallback: boolean): z.ZodType<boolean, z.ZodTypeDef, unknown> {
  return z.preprocess((value) => {
    const raw = asString(value);
    if (raw === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
  }, z.boolean());
}

function numeric(fallback: number): z.ZodType<number, z.ZodTypeDef, unknown> {
  return z.preprocess((value) => {
    const raw = asString(value);
    if (raw === '') return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }, z.number());
}

const artifactMode = z
  .enum(['on', 'off', 'retain-on-failure', 'on-first-retry'])
  .optional()
  .default('retain-on-failure');

// zod 3 is pinned deliberately: zod 4's CommonJS build fails to initialise
// under the CJS transform Playwright applies to config files.
const schema = z.object({
  TEST_ENV: z.enum(['demo', 'local', 'dev', 'qa', 'staging', 'prod']).optional().default('demo'),
  BASE_URL: z.string().optional(),
  API_BASE_URL: z.string().optional(),
  API_TOKEN: z.string().optional(),

  HEADLESS: booleanish(true),
  SLOW_MO: numeric(0),
  WORKERS: z.string().optional(),
  RETRIES: z.string().optional(),

  TIMEOUT_ACTION: numeric(TIMEOUTS.MEDIUM),
  TIMEOUT_NAVIGATION: numeric(TIMEOUTS.LONG),
  TIMEOUT_EXPECT: numeric(TIMEOUTS.EXPECT),
  TIMEOUT_TEST: numeric(TIMEOUTS.TEST),

  TRACE: artifactMode,
  VIDEO: artifactMode,
  SCREENSHOT: z.enum(['on', 'off', 'only-on-failure']).optional().default('only-on-failure'),

  VIEWPORT_WIDTH: numeric(1920),
  VIEWPORT_HEIGHT: numeric(1080),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).optional().default('info'),

  STANDARD_USER: z.string().optional(),
  STANDARD_PASSWORD: z.string().optional(),
  ADMIN_USER: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  READONLY_USER: z.string().optional(),
  READONLY_PASSWORD: z.string().optional(),

  CI: booleanish(false),
  ALLURE_ENABLED: booleanish(false),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const raw = parsed.data;
const environment: EnvironmentConfig = getEnvironment(raw.TEST_ENV);
const isCI = raw.CI || process.env.CI === 'true' || process.env.CI === '1';

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

/**
 * The single, validated, strongly-typed view of runtime configuration.
 * Nothing in the framework should read `process.env` directly.
 */
export const config = {
  env: environment.name,
  environment,
  isCI,

  baseURL: raw.BASE_URL?.trim() || environment.baseURL,
  apiBaseURL: raw.API_BASE_URL?.trim() || environment.apiBaseURL,
  apiToken: raw.API_TOKEN ?? '',

  headless: isCI ? true : raw.HEADLESS,
  slowMo: raw.SLOW_MO,
  workers: optionalNumber(raw.WORKERS) ?? environment.workers,
  retries: optionalNumber(raw.RETRIES) ?? (isCI ? environment.retries : 0),

  timeouts: {
    action: raw.TIMEOUT_ACTION,
    navigation: raw.TIMEOUT_NAVIGATION,
    expect: raw.TIMEOUT_EXPECT,
    test: raw.TIMEOUT_TEST,
  },

  artifacts: {
    trace: raw.TRACE,
    video: raw.VIDEO,
    screenshot: raw.SCREENSHOT,
  },

  viewport: { width: raw.VIEWPORT_WIDTH, height: raw.VIEWPORT_HEIGHT },

  logLevel: raw.LOG_LEVEL,
  allureEnabled: raw.ALLURE_ENABLED,
  ignoreHTTPSErrors: environment.ignoreHTTPSErrors,

  paths: {
    root: ROOT_DIR,
    storage: path.join(ROOT_DIR, 'storage'),
    reports: path.join(ROOT_DIR, 'reports'),
    testResults: path.join(ROOT_DIR, 'test-results'),
    downloads: path.join(ROOT_DIR, 'test-results', 'downloads'),
    uploads: path.join(ROOT_DIR, 'src', 'data', 'files'),
    testData: path.join(ROOT_DIR, 'src', 'data'),
  },
} as const;

const CREDENTIALS: Record<UserRole, { username?: string; password?: string }> = {
  standard: { username: raw.STANDARD_USER, password: raw.STANDARD_PASSWORD },
  admin: { username: raw.ADMIN_USER, password: raw.ADMIN_PASSWORD },
  readonly: { username: raw.READONLY_USER, password: raw.READONLY_PASSWORD },
  guest: { username: '', password: '' },
};

/**
 * Resolves credentials for a role, failing loudly at the point of use rather
 * than silently logging in as `undefined`.
 */
export function getUser(role: UserRole): TestUser {
  const credentials = CREDENTIALS[role];
  if (role !== 'guest' && (!credentials.username || !credentials.password)) {
    throw new Error(
      `Missing credentials for role "${role}". Set ${role.toUpperCase()}_USER and ` +
        `${role.toUpperCase()}_PASSWORD in your .env or CI secrets.`,
    );
  }
  return {
    role,
    username: credentials.username ?? '',
    password: credentials.password ?? '',
    storageStatePath: path.join(config.paths.storage, `${role}.json`),
  };
}

export type AppConfig = typeof config;
