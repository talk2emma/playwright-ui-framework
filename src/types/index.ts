import type { Locator, Page } from '@playwright/test';

/* -------------------------------------------------------------------------- */
/* Environment                                                                 */
/* -------------------------------------------------------------------------- */

export type EnvironmentName = 'demo' | 'local' | 'dev' | 'qa' | 'staging' | 'prod';

export interface EnvironmentConfig {
  name: EnvironmentName;
  baseURL: string;
  apiBaseURL: string;
  retries: number;
  workers?: number | undefined;
  ignoreHTTPSErrors: boolean;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

/* -------------------------------------------------------------------------- */
/* Users / roles                                                               */
/* -------------------------------------------------------------------------- */

export type UserRole = 'standard' | 'admin' | 'readonly' | 'guest';

export interface TestUser {
  role: UserRole;
  username: string;
  password: string;
  storageStatePath?: string;
  displayName?: string;
}

/* -------------------------------------------------------------------------- */
/* Components                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Anything a component can be built from: a raw CSS/XPath selector, an
 * already-resolved Locator, or a factory that derives one from a scope.
 */
export type SelectorLike = string | Locator | ((scope: Page | Locator) => Locator);

export interface ComponentOptions {
  /** Human-readable name used in logs, trace steps and error messages. */
  name?: string;
  /** Per-component override of the default action timeout. */
  timeout?: number;
  /** Scroll the element into view before acting. Defaults to true. */
  autoScroll?: boolean;
  /** Wait for the element to be stable (no bounding-box movement) before acting. */
  waitForStable?: boolean;
  /** Treat the component as living inside this iframe selector. */
  frameSelector?: string;
  /** Pierce this shadow host before resolving the selector. */
  shadowHost?: string;
}

/** The observable state of any UI element, used by assertions and diagnostics. */
export interface ElementState {
  exists: boolean;
  visible: boolean;
  enabled: boolean;
  editable: boolean;
  checked: boolean | null;
  focused: boolean;
  text: string;
  value: string | null;
  boundingBox: BoundingBox | null;
  attributes: Record<string, string>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ClickOptions = {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  delay?: number;
  force?: boolean;
  modifiers?: Array<'Alt' | 'Control' | 'ControlOrMeta' | 'Meta' | 'Shift'>;
  position?: { x: number; y: number };
  timeout?: number;
  trial?: boolean;
  noWaitAfter?: boolean;
};

export type FillOptions = {
  clearFirst?: boolean;
  pressSequentially?: boolean;
  delay?: number;
  force?: boolean;
  timeout?: number;
  validate?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Tables / grids                                                              */
/* -------------------------------------------------------------------------- */

export type TableRow = Record<string, string>;

export type SortDirection = 'asc' | 'desc' | 'none';

/* -------------------------------------------------------------------------- */
/* Network                                                                     */
/* -------------------------------------------------------------------------- */

export interface MockResponse<T = unknown> {
  status?: number;
  headers?: Record<string, string>;
  body?: T;
  contentType?: string;
  delayMs?: number;
}

export interface CapturedRequest {
  url: string;
  method: string;
  postData: string | null;
  headers: Record<string, string>;
  timestamp: number;
}

/* -------------------------------------------------------------------------- */
/* Accessibility / visual                                                      */
/* -------------------------------------------------------------------------- */

export type WcagTag = 'wcag2a' | 'wcag2aa' | 'wcag21a' | 'wcag21aa' | 'wcag22aa' | 'best-practice';

export interface A11yScanOptions {
  include?: string[];
  exclude?: string[];
  tags?: WcagTag[];
  disableRules?: string[];
  /** Fail the test when violations are found. Defaults to true. */
  failOnViolation?: boolean;
  /** Attach an HTML report of the scan to the test result. */
  attachReport?: boolean;
}
