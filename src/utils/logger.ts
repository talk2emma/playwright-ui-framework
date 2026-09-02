import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config/env.config';
import type { LogLevel } from '../types';

/**
 * Structured logger with console and file output.
 *
 * Deliberately dependency-free: general-purpose logging libraries pull in
 * stream polyfills that break across Node releases, and a test framework
 * cannot afford a logger that fails to load. Everything needed here — levels,
 * scopes, colour, JSON-lines files — is a few dozen lines.
 */

const LEVEL_ORDER: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };

const ESC = String.fromCharCode(27);
const COLOR = {
  reset: `${ESC}[0m`,
  dim: `${ESC}[2m`,
  red: `${ESC}[31m`,
  yellow: `${ESC}[33m`,
  cyan: `${ESC}[36m`,
  green: `${ESC}[32m`,
  gray: `${ESC}[90m`,
} as const;

const LEVEL_COLOR: Record<LogLevel, string> = {
  error: COLOR.red,
  warn: COLOR.yellow,
  info: COLOR.cyan,
  debug: COLOR.green,
  trace: COLOR.gray,
};

export interface Logger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
  trace(message: string, meta?: Record<string, unknown>): void;
  /** Derives a logger whose scope is nested under this one. */
  child(scope: string): Logger;
}

class FileSink {
  private stream: fs.WriteStream | undefined;
  private failed = false;

  constructor(private readonly filePath: string) {}

  write(line: string): void {
    if (this.failed) return;
    try {
      if (!this.stream) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        this.stream = fs.createWriteStream(this.filePath, { flags: 'a' });
        this.stream.on('error', () => {
          this.failed = true;
        });
      }
      this.stream.write(`${line}\n`);
    } catch {
      // Logging must never be the reason a test fails.
      this.failed = true;
    }
  }
}

const logsDir = path.join(config.paths.testResults, 'logs');
const runSink = new FileSink(path.join(logsDir, 'test-run.log'));
const errorSink = new FileSink(path.join(logsDir, 'errors.log'));

const threshold = LEVEL_ORDER[config.logLevel] ?? LEVEL_ORDER.info;
const useColor = process.stdout.isTTY === true && !config.isCI;

function emit(
  level: LogLevel,
  scope: string | undefined,
  message: string,
  meta?: Record<string, unknown>,
): void {
  if (LEVEL_ORDER[level] > threshold) return;

  const timestamp = new Date();
  const record = {
    time: timestamp.toISOString(),
    level,
    ...(scope ? { scope } : {}),
    message,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
    pid: process.pid,
  };

  const serialized = JSON.stringify(record);
  runSink.write(serialized);
  if (level === 'error') errorSink.write(serialized);

  const clock = timestamp.toISOString().slice(11, 23);
  const scopeTag = scope ? ` [${scope}]` : '';
  const extra = meta && Object.keys(meta).length > 0 ? ` ${safeStringify(meta)}` : '';
  const line = useColor
    ? `${COLOR.dim}${clock}${COLOR.reset} ${LEVEL_COLOR[level]}${level.padEnd(5)}${COLOR.reset}${scopeTag} ${message}${COLOR.gray}${extra}${COLOR.reset}`
    : `${clock} ${level.padEnd(5)}${scopeTag} ${message}${extra}`;

  // Everything below `warn` goes to stdout so CI error streams stay signal-only.
  if (level === 'error' || level === 'warn') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

function build(scope?: string): Logger {
  return {
    error: (message, meta) => emit('error', scope, message, meta),
    warn: (message, meta) => emit('warn', scope, message, meta),
    info: (message, meta) => emit('info', scope, message, meta),
    debug: (message, meta) => emit('debug', scope, message, meta),
    trace: (message, meta) => emit('trace', scope, message, meta),
    child: (childScope: string) => build(scope ? `${scope}:${childScope}` : childScope),
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, item: unknown) =>
      item instanceof Error ? { name: item.name, message: item.message } : item,
    );
  } catch {
    return '[unserializable]';
  }
}

/** Framework-wide logger. Prefer `createLogger('Scope')` inside components. */
export const logger: Logger = build();

export function createLogger(scope: string): Logger {
  return build(scope);
}
