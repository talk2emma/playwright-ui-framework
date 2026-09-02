import type { FullConfig } from '@playwright/test';
import fs from 'node:fs';
import { config } from '../config/env.config';
import { ensureDir } from '../utils/file.utils';
import { logger } from '../utils/logger';
import { humanizeDuration } from '../utils/date.utils';

/**
 * Runs once before the entire suite.
 *
 * Keep this cheap and idempotent: it blocks every worker. Anything per-role or
 * per-test belongs in a fixture or in `auth.setup.ts`.
 */
async function globalSetup(fullConfig: FullConfig): Promise<void> {
  const startedAt = Date.now();

  for (const dir of [
    config.paths.reports,
    config.paths.testResults,
    config.paths.storage,
    config.paths.downloads,
  ]) {
    ensureDir(dir);
  }

  // A stale HTML report is worse than none — it silently shows an old run.
  fs.rmSync(`${config.paths.reports}/html`, { recursive: true, force: true });

  logger.info('Test run starting', {
    environment: config.env,
    baseURL: config.baseURL,
    workers: fullConfig.workers,
    projects: fullConfig.projects.map((project) => project.name).join(', '),
    ci: config.isCI,
  });

  process.env.TEST_RUN_STARTED_AT = String(startedAt);
  logger.debug('Global setup complete', { ms: humanizeDuration(Date.now() - startedAt) });
}

export default globalSetup;
