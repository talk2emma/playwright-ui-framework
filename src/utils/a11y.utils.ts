import AxeBuilder from '@axe-core/playwright';
import { createHtmlReport } from 'axe-html-reporter';
import { test, type Page, type TestInfo } from '@playwright/test';
import type { AxeResults, Result } from 'axe-core';
import { createLogger } from './logger';
import type { A11yScanOptions, WcagTag } from '../types';

const log = createLogger('A11y');

export const DEFAULT_WCAG_TAGS: WcagTag[] = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export interface A11yReport {
  violations: Result[];
  passes: number;
  incomplete: number;
  summary: string;
  url: string;
}

/**
 * Runs an axe-core scan against the current page (or a subtree of it) and
 * attaches a readable report to the test result.
 *
 * `failOnViolation` defaults to true: accessibility regressions should break
 * the build, not sit in a report nobody opens.
 */
export async function scanAccessibility(
  page: Page,
  options: A11yScanOptions = {},
  testInfo?: TestInfo,
): Promise<A11yReport> {
  const {
    include,
    exclude,
    tags = DEFAULT_WCAG_TAGS,
    disableRules = [],
    failOnViolation = true,
    attachReport = true,
  } = options;

  let builder = new AxeBuilder({ page }).withTags(tags);
  if (include) for (const selector of include) builder = builder.include(selector);
  if (exclude) for (const selector of exclude) builder = builder.exclude(selector);
  if (disableRules.length > 0) builder = builder.disableRules(disableRules);

  const results: AxeResults = await builder.analyze();
  const report: A11yReport = {
    violations: results.violations,
    passes: results.passes.length,
    incomplete: results.incomplete.length,
    summary: formatViolations(results.violations),
    url: page.url(),
  };

  const info = testInfo ?? safeTestInfo();
  if (attachReport && info) {
    await info.attach('accessibility-scan.json', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    });
    // The HTML version is what non-engineers on the team will actually read.
    const html = createHtmlReport({
      results,
      options: { doNotCreateReportFile: true, projectKey: page.url() },
    });
    await info.attach('accessibility-report.html', { body: html, contentType: 'text/html' });
  }

  if (results.violations.length > 0) {
    log.warn('Accessibility violations found', {
      count: results.violations.length,
      url: report.url,
    });
    if (failOnViolation) {
      throw new Error(
        `${results.violations.length} accessibility violation(s) on ${report.url}\n${report.summary}`,
      );
    }
  } else {
    log.info('No accessibility violations', { url: report.url, checks: report.passes });
  }

  return report;
}

/** Compact, reviewable rendering of axe violations for the failure message. */
export function formatViolations(violations: Result[]): string {
  return violations
    .map((violation, index) => {
      const nodes = violation.nodes
        .slice(0, 5)
        .map((node) => `      - ${node.target.join(' ')}\n        ${node.failureSummary ?? ''}`)
        .join('\n');
      const more =
        violation.nodes.length > 5 ? `\n      … ${violation.nodes.length - 5} more element(s)` : '';
      return (
        `  ${index + 1}. [${violation.impact ?? 'unknown'}] ${violation.id} — ${violation.help}\n` +
        `     ${violation.helpUrl}\n${nodes}${more}`
      );
    })
    .join('\n');
}

function safeTestInfo(): TestInfo | undefined {
  try {
    return test.info();
  } catch {
    return undefined;
  }
}
