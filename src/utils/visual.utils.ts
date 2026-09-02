import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../config/timeouts';
import type { VisualCompareOptions } from '../types';

/**
 * Elements that are expected to differ between runs and must be masked out of
 * every screenshot comparison. Extend per application.
 */
export const DEFAULT_MASK_SELECTORS = [
  '[data-testid="timestamp"]',
  '[data-visual-ignore]',
  '.dynamic-date',
  'video',
];

/** Stops CSS animations/transitions and hides caret so shots are deterministic. */
export async function stabilizePage(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
    `,
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(TIMEOUTS.ANIMATION);
}

/** Full-page visual baseline check with sane, shared defaults. */
export async function comparePage(
  page: Page,
  name: string,
  options: VisualCompareOptions = {},
): Promise<void> {
  await stabilizePage(page);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: options.fullPage ?? true,
    animations: options.animations ?? 'disabled',
    maxDiffPixelRatio: options.maxDiffPixelRatio ?? 0.01,
    threshold: options.threshold ?? 0.2,
    mask: options.mask ?? [page.locator(DEFAULT_MASK_SELECTORS.join(', '))],
    timeout: TIMEOUTS.LONG,
  });
}

/** Component-level baseline — far less brittle than full-page shots. */
export async function compareElement(
  locator: Locator,
  name: string,
  options: VisualCompareOptions = {},
): Promise<void> {
  await stabilizePage(locator.page());
  await expect(locator).toHaveScreenshot(`${name}.png`, {
    animations: options.animations ?? 'disabled',
    maxDiffPixels: options.maxDiffPixels ?? 100,
    threshold: options.threshold ?? 0.2,
    mask: options.mask ?? [],
    timeout: TIMEOUTS.LONG,
  });
}

/** Captures the same view at several widths — responsive regression coverage. */
export async function compareResponsive(
  page: Page,
  name: string,
  widths: number[] = [375, 768, 1280, 1920],
): Promise<void> {
  const original = page.viewportSize();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await comparePage(page, `${name}-${width}w`);
  }
  if (original) await page.setViewportSize(original);
}
