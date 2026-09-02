import type { Frame, FrameLocator, Locator, Page } from '@playwright/test';
import type { ComponentOptions, SelectorLike } from '../types';

export type Scope = Page | Frame | Locator | FrameLocator;

/**
 * Resolves any `SelectorLike` into a Locator against a scope, applying the
 * iframe and shadow-DOM options that components declare.
 *
 * Centralising this is what lets every component accept a string, a Locator or
 * a builder function without each one re-implementing resolution.
 */
export function resolveLocator(
  scope: Scope,
  selector: SelectorLike,
  options: Pick<ComponentOptions, 'frameSelector' | 'shadowHost'> = {},
): Locator {
  const target = options.frameSelector ? enterFrame(scope, options.frameSelector) : scope;

  if (typeof selector === 'function') {
    return selector(target as Page | Locator);
  }

  if (typeof selector !== 'string') {
    return selector;
  }

  const base = options.shadowHost
    ? (target as Page).locator(options.shadowHost).locator(selector)
    : (target as Page).locator(selector);

  return base;
}

function enterFrame(scope: Scope, frameSelector: string): FrameLocator {
  return (scope as Page).frameLocator(frameSelector);
}

/**
 * Preferred locator strategies, most to least resilient.
 *
 * Teams should reach for `byTestId` and the role/label helpers first; CSS and
 * XPath exist for legacy applications that give you nothing better.
 */
export const by = {
  testId: (scope: Page | Locator, id: string): Locator => scope.getByTestId(id),

  role: (
    scope: Page | Locator,
    role: Parameters<Page['getByRole']>[0],
    options?: Parameters<Page['getByRole']>[1],
  ): Locator => scope.getByRole(role, options),

  label: (scope: Page | Locator, text: string | RegExp, exact = false): Locator =>
    scope.getByLabel(text, { exact }),

  placeholder: (scope: Page | Locator, text: string | RegExp, exact = false): Locator =>
    scope.getByPlaceholder(text, { exact }),

  text: (scope: Page | Locator, text: string | RegExp, exact = false): Locator =>
    scope.getByText(text, { exact }),

  title: (scope: Page | Locator, text: string | RegExp): Locator => scope.getByTitle(text),

  altText: (scope: Page | Locator, text: string | RegExp): Locator => scope.getByAltText(text),

  css: (scope: Page | Locator, selector: string): Locator => scope.locator(selector),

  xpath: (scope: Page | Locator, expression: string): Locator =>
    scope.locator(`xpath=${expression}`),

  /** Matches an element by any of several attributes — for messy legacy markup. */
  anyAttribute: (scope: Page | Locator, attributes: Record<string, string>): Locator => {
    const selector = Object.entries(attributes)
      .map(([key, value]) => `[${key}="${value}"]`)
      .join(', ');
    return scope.locator(selector);
  },

  /** Element that contains the given text, scoped to a tag. */
  containingText: (scope: Page | Locator, tag: string, text: string | RegExp): Locator =>
    scope.locator(tag).filter({ hasText: text }),

  /** Nth match, 1-based to read naturally in test code. */
  nth: (locator: Locator, position: number): Locator => locator.nth(position - 1),
} as const;
