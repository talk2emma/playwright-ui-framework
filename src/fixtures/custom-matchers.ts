import { expect as baseExpect, type Locator, type Page } from '@playwright/test';
import { scanAccessibility } from '../utils/a11y.utils';
import { normalizeText } from '../utils/string.utils';
import type { A11yScanOptions } from '../types';

/**
 * Domain-specific assertions.
 *
 * Each one exists because the equivalent inline check appeared in enough
 * tests to be worth naming — and because a named matcher produces a far
 * better failure message than `expect(await x.y()).toBe(true)`.
 */
export const expect = baseExpect.extend({
  /** Passes when axe finds no violations in the given scope. */
  async toBeAccessible(page: Page, options: A11yScanOptions = {}) {
    const report = await scanAccessibility(page, { ...options, failOnViolation: false });
    return {
      pass: report.violations.length === 0,
      message: () =>
        report.violations.length === 0
          ? 'Expected accessibility violations, but the page was clean'
          : `Expected no accessibility violations, found ${report.violations.length}:\n${report.summary}`,
      name: 'toBeAccessible',
    };
  },

  /** Passes when the element is present, visible and interactive. */
  async toBeInteractive(locator: Locator) {
    const [visible, enabled] = await Promise.all([
      locator.isVisible().catch(() => false),
      locator.isEnabled().catch(() => false),
    ]);
    const pass = visible && enabled;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${locator.toString()} not to be interactive`
          : `Expected ${locator.toString()} to be interactive (visible: ${visible}, enabled: ${enabled})`,
      name: 'toBeInteractive',
    };
  },

  /** Compares text after collapsing whitespace — DOM text is rarely tidy. */
  async toHaveNormalizedText(locator: Locator, expected: string) {
    const actual = normalizeText(await locator.innerText());
    const pass = actual === normalizeText(expected);
    return {
      pass,
      message: () =>
        pass
          ? `Expected text not to be "${expected}"`
          : `Expected normalized text "${normalizeText(expected)}" but received "${actual}"`,
      name: 'toHaveNormalizedText',
    };
  },

  /** Passes when a form control is marked invalid by ARIA or the browser. */
  async toHaveValidationError(locator: Locator, expectedMessage?: string | RegExp) {
    const ariaInvalid = await locator.getAttribute('aria-invalid');
    const nativeMessage = await locator.evaluate((element) =>
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? element.validationMessage
        : '',
    );
    const describedBy = await locator.getAttribute('aria-describedby');
    const describedText = describedBy
      ? await locator
          .page()
          .locator(`#${describedBy}`)
          .innerText()
          .catch(() => '')
      : '';

    const message = nativeMessage || describedText;
    const isInvalid = ariaInvalid === 'true' || message !== '';
    const matches =
      expectedMessage === undefined
        ? true
        : typeof expectedMessage === 'string'
          ? message.includes(expectedMessage)
          : expectedMessage.test(message);

    return {
      pass: isInvalid && matches,
      message: () =>
        isInvalid
          ? `Expected validation message ${String(expectedMessage)} but received "${message}"`
          : `Expected ${locator.toString()} to show a validation error, but it is valid`,
      name: 'toHaveValidationError',
    };
  },

  /** Passes when the element sits fully inside the viewport. */
  async toBeInViewport(locator: Locator) {
    const result = await locator.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        inside:
          box.top >= 0 &&
          box.left >= 0 &&
          box.bottom <= window.innerHeight &&
          box.right <= window.innerWidth,
        box: { top: box.top, left: box.left, bottom: box.bottom, right: box.right },
      };
    });
    return {
      pass: result.inside,
      message: () =>
        result.inside
          ? `Expected ${locator.toString()} to be outside the viewport`
          : `Expected ${locator.toString()} to be inside the viewport; box was ${JSON.stringify(result.box)}`,
      name: 'toBeInViewport',
    };
  },

  /** Passes when a list is sorted — numerically when it looks numeric. */
  toBeSorted(values: string[], direction: 'asc' | 'desc' = 'asc') {
    const numeric = values.every(
      (value) => value !== '' && !Number.isNaN(Number(value.replace(/[^0-9.-]/g, ''))),
    );
    const sorted = [...values].sort((a, b) =>
      numeric
        ? Number(a.replace(/[^0-9.-]/g, '')) - Number(b.replace(/[^0-9.-]/g, ''))
        : a.localeCompare(b),
    );
    if (direction === 'desc') sorted.reverse();
    const pass = JSON.stringify(values) === JSON.stringify(sorted);
    return {
      pass,
      message: () =>
        pass
          ? `Expected values not to be sorted ${direction}`
          : `Expected ${direction} order:\n  actual:   ${values.join(', ')}\n  expected: ${sorted.join(', ')}`,
      name: 'toBeSorted',
    };
  },
});
