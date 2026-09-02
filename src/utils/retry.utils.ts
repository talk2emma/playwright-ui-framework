import { TIMEOUTS } from '../config/timeouts';

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
