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
