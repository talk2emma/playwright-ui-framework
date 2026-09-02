import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env.config';
import { logger } from '../utils/logger';
import { humanizeDuration } from '../utils/date.utils';

/**
 * Runs once after the entire suite: clean up scratch files and report timing.
 * Artifacts (traces, videos, reports) are deliberately left in place.
 */
async function globalTeardown(): Promise<void> {
  const tempDir = path.join(config.paths.testResults, 'tmp');
  fs.rmSync(tempDir, { recursive: true, force: true });

  const startedAt = Number(process.env.TEST_RUN_STARTED_AT ?? Date.now());
  logger.info('Test run finished', {
    environment: config.env,
    duration: humanizeDuration(Date.now() - startedAt),
    reports: config.paths.reports,
  });
}

export default globalTeardown;
