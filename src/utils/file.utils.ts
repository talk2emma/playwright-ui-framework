import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { parse as parseCsv } from 'csv-parse/sync';
import XlsxPopulate from 'xlsx-populate';
import { config } from '../config/env.config';
import { waitUntil } from './retry.utils';

export function ensureDir(dir: string): string {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Resolves a path against the test-data directory when it is not absolute. */
export function resolveDataPath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(config.paths.testData, filePath);
}

export async function readJson<T>(filePath: string): Promise<T> {
  const content = await fsp.readFile(resolveDataPath(filePath), 'utf-8');
  return JSON.parse(content) as T;
}

export async function writeJson(filePath: string, data: unknown): Promise<void> {
  ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readCsv<T extends Record<string, string>>(filePath: string): Promise<T[]> {
  const content = await fsp.readFile(resolveDataPath(filePath), 'utf-8');
  return parseCsv(content, { columns: true, skip_empty_lines: true, trim: true });
}

/**
 * Reads a spreadsheet into row objects keyed by the header row.
 * Business teams hand over test cases as .xlsx far more often than as JSON.
 */
export async function readExcel<T extends Record<string, string>>(
  filePath: string,
  sheet: string | number = 0,
): Promise<T[]> {
  const workbook = await XlsxPopulate.fromFileAsync(resolveDataPath(filePath));
  const target = workbook.sheet(sheet);
  if (!target) throw new Error(`Sheet "${String(sheet)}" not found in ${filePath}`);

  const rows: unknown[][] = target.usedRange()?.value() ?? [];
  const [header, ...body] = rows;
  if (!header) return [];

  const columns = header.map(cellToString);
  return body
    .filter((row) => row.some((cell) => cellToString(cell) !== ''))
    .map((row) => {
      const record: Record<string, string> = {};
      columns.forEach((column, index) => {
        record[column] = cellToString(row[index]);
      });
      return record as T;
    });
}

/** Spreadsheet cells arrive as strings, numbers, booleans, dates or null. */
function cellToString(cell: unknown): string {
  if (cell === undefined || cell === null) return '';
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell === 'object') return JSON.stringify(cell);
  if (typeof cell === 'number' || typeof cell === 'boolean') return String(cell);
  if (typeof cell === 'string') return cell.trim();
  return '';
}

export async function readText(filePath: string): Promise<string> {
  return fsp.readFile(resolveDataPath(filePath), 'utf-8');
}

/** Creates a throwaway file for upload testing and returns its absolute path. */
export async function createTempFile(
  fileName: string,
  content: string | Buffer = 'playwright upload test',
): Promise<string> {
  const dir = ensureDir(path.join(config.paths.testResults, 'tmp'));
  const filePath = path.join(dir, fileName);
  await fsp.writeFile(filePath, content);
  return filePath;
}

/** Creates a file of an exact size — for max-upload-size boundary checks. */
export async function createFileOfSize(fileName: string, bytes: number): Promise<string> {
  return createTempFile(fileName, Buffer.alloc(bytes, 'a'));
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** Waits for a file to appear and stop growing — i.e. a download that finished. */
export async function waitForStableFile(filePath: string, timeout = 30_000): Promise<void> {
  let lastSize = -1;
  await waitUntil(
    async () => {
      if (!(await fileExists(filePath))) return false;
      const { size } = await fsp.stat(filePath);
      const stable = size > 0 && size === lastSize;
      lastSize = size;
      return stable;
    },
    { timeout, message: `File "${filePath}" did not stabilise within ${timeout}ms` },
  );
}

export async function deleteIfExists(filePath: string): Promise<void> {
  await fsp.rm(filePath, { force: true, recursive: true });
}

export function getFileSize(filePath: string): number {
  return fs.statSync(filePath).size;
}

export async function listFiles(dir: string, extension?: string): Promise<string[]> {
  if (!fs.existsSync(dir)) return [];
  const entries = await fsp.readdir(dir);
  const filtered = extension ? entries.filter((f) => f.endsWith(extension)) : entries;
  return filtered.map((f) => path.join(dir, f));
}
