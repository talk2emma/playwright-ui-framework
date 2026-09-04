import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { config } from './src/config/env.config';

/**
 * Playwright configuration.
 *
 * Everything environment-dependent comes from `src/config/env.config.ts`,
 * which validates the process environment with zod at load time — so a typo in
 * a CI variable fails immediately with a readable message instead of producing
 * a mysteriously misdirected test run.
 */

const reporters: ReporterDescription[] = [
  ['list', { printSteps: false }],
  ['html', { outputFolder: 'reports/html', open: config.isCI ? 'never' : 'on-failure' }],
  ['junit', { outputFile: 'reports/junit/results.xml' }],
  ['json', { outputFile: 'reports/json/results.json' }],
  ['./src/reporters/summary.reporter.ts'],
  ['playwright-ctrf-json-reporter', { outputDir: 'reports/ctrf', outputFile: 'ctrf-report.json' }],
];

if (config.allureEnabled) {
  reporters.push([
    'allure-playwright',
    {
      resultsDir: 'reports/allure-results',
      detail: true,
      environmentInfo: {
        environment: config.env,
        baseURL: config.baseURL,
        node: process.version,
      },
    },
  ]);
}

if (config.isCI) {
  reporters.push(['github'], ['blob', { outputDir: 'blob-report' }]);
}

/**
 * Chromium-only launch switches.
 *
 * `--disable-dev-shm-usage` stops Chromium exhausting the 64MB /dev/shm that
 * CI containers typically provide. It is a Chromium flag: WebKit refuses to
 * start when it is passed one it does not know —
 * "Cannot parse arguments: Unknown option --disable-dev-shm-usage" — and
 * Firefox ignores it silently, which is worse, because it hides the mistake
 * until a WebKit job runs.
 *
 * So it is applied per project rather than in the global `use` block. Add
 * engine-specific switches here, never above.
 */
const chromiumLaunch = {
  launchOptions: { slowMo: config.slowMo, args: ['--disable-dev-shm-usage'] },
};

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  /*
   * `{platform}` is load-bearing. Font rasterisation and scrollbar metrics
   * differ between operating systems, so a baseline recorded on macOS never
   * matches a Linux CI render. Without the platform in the path the two are
   * compared anyway and the suite is permanently red for a reason that looks
   * like a real regression.
   */
  snapshotPathTemplate:
    '{testDir}/{testFileDir}/__screenshots__/{projectName}/{arg}-{platform}{ext}',

  /* Execution ------------------------------------------------------------ */
  fullyParallel: true,
  workers: config.workers ?? (config.isCI ? '50%' : undefined),
  retries: config.retries,
  maxFailures: config.isCI ? 25 : 0,
  timeout: config.timeouts.test,
  globalTimeout: config.isCI ? 45 * 60 * 1000 : undefined,

  /* Guardrails ----------------------------------------------------------- */
  // `test.only` left in a commit would silently skip the whole suite in CI.
  forbidOnly: config.isCI,
  // Any test that reports itself flaky should be fixed, not tolerated.
  reportSlowTests: { max: 10, threshold: 60_000 },

  expect: {
    timeout: config.timeouts.expect,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
      scale: 'css',
    },
    toMatchAriaSnapshot: { pathTemplate: '{testDir}/{testFileDir}/__aria__/{arg}{ext}' },
  },

  globalSetup: './src/hooks/global.setup.ts',
  globalTeardown: './src/hooks/global.teardown.ts',

  /* Shared browser context ---------------------------------------------- */
  use: {
    baseURL: config.baseURL,
    headless: config.headless,
    viewport: config.viewport,
    ignoreHTTPSErrors: config.ignoreHTTPSErrors,

    actionTimeout: config.timeouts.action,
    navigationTimeout: config.timeouts.navigation,

    trace: config.artifacts.trace,
    video: config.artifacts.video,
    screenshot: config.artifacts.screenshot,

    /* `slowMo` is understood by every engine; engine-specific switches are
     * applied per project via `chromiumLaunch` below. */
    launchOptions: {
      slowMo: config.slowMo,
    },

    // Locators resolved by this attribute keep tests decoupled from styling.
    testIdAttribute: 'data-testid',

    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',

    extraHTTPHeaders: {
      // Lets the application (and log filters) identify automated traffic.
      'x-automated-test': 'playwright',
    },
  },

  /* Projects ------------------------------------------------------------- */
  projects: [
    {
      name: 'setup',
      testDir: './src/hooks',
      testMatch: /.*\.setup\.ts/,
    },

    /* Desktop browsers */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...chromiumLaunch },
      dependencies: ['setup'],
      testIgnore: ['**/visual/**', '**/a11y/**'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
      testIgnore: ['**/visual/**', '**/a11y/**'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
      testIgnore: ['**/visual/**', '**/a11y/**'],
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge', ...chromiumLaunch },
      dependencies: ['setup'],
      testIgnore: ['**/visual/**', '**/a11y/**'],
    },

    /* Mobile and tablet emulation */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], ...chromiumLaunch },
      dependencies: ['setup'],
      testIgnore: ['**/visual/**', '**/a11y/**'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      dependencies: ['setup'],
      testIgnore: ['**/visual/**', '**/a11y/**'],
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
      dependencies: ['setup'],
      testIgnore: ['**/visual/**', '**/a11y/**'],
    },

    /* Specialised suites ------------------------------------------------- */
    {
      // Pixel comparison is meaningful only on one fixed rendering stack.
      name: 'visual',
      testDir: './tests/visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        ...chromiumLaunch,
      },
      dependencies: ['setup'],
    },
    {
      name: 'accessibility',
      testDir: './tests/a11y',
      use: { ...devices['Desktop Chrome'], ...chromiumLaunch },
      dependencies: ['setup'],
    },

    /* Cross-cutting conditions */
    {
      name: 'dark-mode',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark', ...chromiumLaunch },
      dependencies: ['setup'],
      testIgnore: ['**/visual/**', '**/a11y/**'],
    },
  ],

  /* Local app under test -------------------------------------------------
   * Uncomment when the suite should start the application itself.
   *
   * webServer: {
   *   command: 'npm run start',
   *   url: config.baseURL,
   *   reuseExistingServer: !config.isCI,
   *   timeout: 120_000,
   * },
   */

  reporter: reporters,
  quiet: false,
  preserveOutput: 'failures-only',
});
