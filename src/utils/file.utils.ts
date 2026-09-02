import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env.config';

export function ensureDir(dir: string): string {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Resolves a path against the test-data directory when it is not absolute. */
export function resolveDataPath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(config.paths.testData, filePath);
}
