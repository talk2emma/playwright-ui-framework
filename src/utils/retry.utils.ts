import { TIMEOUTS } from '../config/timeouts';
import { logger } from './logger';
import type { RetryPolicy } from '../types';

const DEFAULT_POLICY: Required<Omit<RetryPolicy, 'retryOn'>> = {
  attempts: 3,
  delayMs: TIMEOUTS.POLL_INTERVAL,
  backoffFactor: 2,
};

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an operation with exponential backoff.
 *
 * Intended for genuinely flaky boundaries — a third-party widget that needs a
 * second click, a download that occasionally 502s. It is NOT a substitute for
 * a proper web-first assertion; prefer `expect.poll` / auto-waiting first.
 */
export async function retry<T>(
  operation: () => Promise<T>,
  policy: Partial<RetryPolicy> = {},
  description = 'operation',
): Promise<T> {
  const { attempts, delayMs, backoffFactor } = { ...DEFAULT_POLICY, ...policy };
  let lastError: Error = new Error(`${description} failed without an error`);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (policy.retryOn && !policy.retryOn(lastError)) throw lastError;
      if (attempt === attempts) break;
      const wait = delayMs * Math.pow(backoffFactor, attempt - 1);
      logger.debug(`Retrying ${description}`, {
        attempt,
        of: attempts,
        waitMs: wait,
        reason: lastError.message,
      });
      await sleep(wait);
    }
  }

  throw new Error(`${description} failed after ${attempts} attempts: ${lastError.message}`, {
    cause: lastError,
  });
}

/** Polls `condition` until it returns true or the timeout elapses. */
export async function waitUntil(
  condition: () => Promise<boolean> | boolean,
  options: { timeout?: number; interval?: number; message?: string } = {},
): Promise<void> {
  const timeout = options.timeout ?? TIMEOUTS.MEDIUM;
  const interval = options.interval ?? TIMEOUTS.POLL_INTERVAL;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    if (await condition()) return;
    await sleep(interval);
  }
  throw new Error(options.message ?? `Condition not met within ${timeout}ms`);
}

/** Rejects if the promise has not settled within `timeout`. */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeout: number,
  message = 'Operation timed out',
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${message} (${timeout}ms)`)), timeout);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
