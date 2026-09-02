import fs from 'node:fs';
import path from 'node:path';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

interface TestSummary {
  /** True for a `test.fail()`-annotated test that did fail, as intended. */
  expectedFailure?: boolean;
  title: string;
  file: string;
  project: string;
  status: TestResult['status'];
  durationMs: number;
  retries: number;
  error?: string;
  tags: string[];
}

/**
 * Console summary plus a machine-readable `summary.json`.
 *
 * Exists so CI can answer "what broke and how slow are we" without unzipping
 * the HTML report: the JSON is what dashboards and PR comments consume.
 */
export default class SummaryReporter implements Reporter {
  private readonly tests: TestSummary[] = [];
  private startedAt = 0;
  private outputDir = 'reports';

  onBegin(config: FullConfig, suite: Suite): void {
    this.startedAt = Date.now();
    // `rootDir` follows testDir, so anchor reports to the project root instead.
    this.outputDir = path.resolve(process.cwd(), 'reports');
    const total = suite.allTests().length;
    console.log(`\nRunning ${total} test(s) across ${config.projects.length} project(s)\n`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    /*
     * A test annotated `test.fail()` is EXPECTED to fail, and Playwright
     * records that in `test.expectedStatus`. Its raw `result.status` is still
     * `'failed'`, so counting that directly reports a green run as red — which
     * is exactly what happened once the suite began recording known defects
     * this way.
     *
     * The status stored here is therefore the *outcome*: whether the result
     * matched what was expected. An expected failure is a pass; an
     * unexpectedly passing `test.fail()` is a failure, which is the whole
     * point of the annotation — it tells you the defect is fixed.
     */
    const met = result.status === test.expectedStatus;
    const outcome: TestResult['status'] =
      met && result.status === 'failed'
        ? 'passed'
        : !met && result.status === 'passed'
          ? 'failed'
          : result.status;

    this.tests.push({
      title: test.titlePath().slice(1).join(' > '),
      file: path.relative(process.cwd(), test.location.file),
      project: test.parent.project()?.name ?? 'unknown',
      status: outcome,
      /** True when the test is annotated `test.fail()` and did fail. */
      expectedFailure: met && result.status === 'failed',
      durationMs: result.duration,
      retries: result.retry,
      ...(result.error?.message ? { error: stripAnsi(result.error.message).split('\n')[0] } : {}),
      tags: test.tags,
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    const durationMs = Date.now() - this.startedAt;
    const counts = this.tests.reduce<Record<string, number>>((accumulator, test) => {
      accumulator[test.status] = (accumulator[test.status] ?? 0) + 1;
      return accumulator;
    }, {});

    const flaky = this.tests.filter((test) => test.retries > 0 && test.status === 'passed');
    const failures = this.tests.filter(
      (test) => test.status === 'failed' || test.status === 'timedOut',
    );
    const slowest = [...this.tests].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5);

    const summary = {
      status: result.status,
      startedAt: new Date(this.startedAt).toISOString(),
      durationMs,
      totals: {
        total: this.tests.length,
        passed: counts['passed'] ?? 0,
        failed: (counts['failed'] ?? 0) + (counts['timedOut'] ?? 0),
        skipped: counts['skipped'] ?? 0,
        flaky: flaky.length,
      },
      failures,
      flaky,
      slowest,
      tests: this.tests,
    };

    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(
      path.join(this.outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2),
      'utf-8',
    );

    console.log('\n--- Run summary ------------------------------');
    console.log(`  passed   ${summary.totals.passed}`);
    console.log(`  failed   ${summary.totals.failed}`);
    console.log(`  flaky    ${summary.totals.flaky}`);
    console.log(`  skipped  ${summary.totals.skipped}`);
    console.log(`  duration ${(durationMs / 1000).toFixed(1)}s`);

    if (failures.length > 0) {
      console.log('\n  Failures:');
      for (const failure of failures) {
        console.log(`   x ${failure.title} [${failure.project}]`);
        if (failure.error) console.log(`     ${failure.error}`);
      }
    }

    if (slowest[0] && slowest[0].durationMs > 30_000) {
      console.log('\n  Slowest tests:');
      for (const test of slowest) {
        console.log(`   ${(test.durationMs / 1000).toFixed(1)}s  ${test.title}`);
      }
    }

    console.log(`\n  summary.json -> ${path.join(this.outputDir, 'summary.json')}`);
    console.log('----------------------------------------------\n');
  }

  printsToStdio(): boolean {
    return true;
  }
}

const ANSI_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}
