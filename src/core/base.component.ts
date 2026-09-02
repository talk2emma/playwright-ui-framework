import { expect, test, type Locator, type Page } from '@playwright/test';
import { config } from '../config/env.config';
import { TIMEOUTS } from '../config/timeouts';
import { createLogger, type Logger } from '../utils/logger';
import { normalizeText } from '../utils/string.utils';
import { resolveLocator, type Scope } from './locator.factory';
import type {
  BoundingBox,
  ClickOptions,
  ComponentOptions,
  ElementState,
  SelectorLike,
} from '../types';

/**
 * The root of the component model.
 *
 * Every UI element type in `src/components` extends this class, so the
 * behaviour that must be identical everywhere — logging, step reporting,
 * scrolling, stability waits, state inspection, diagnostics on failure — is
 * written once here and inherited rather than copy-pasted.
 *
 * Design rules:
 *  - Wrap, never replace, Playwright's auto-waiting. No arbitrary sleeps.
 *  - Every public action reports itself as a `test.step` so traces read like
 *    a plain-English script.
 *  - Failures carry the component name and selector, not just "locator not found".
 */
export abstract class BaseComponent {
  readonly locator: Locator;
  readonly name: string;
  protected readonly log: Logger;
  protected readonly options: Required<Pick<ComponentOptions, 'autoScroll' | 'waitForStable'>> &
    ComponentOptions;

  /** Element type shown in logs and step titles. Overridden by each subclass. */
  protected get componentType(): string {
    return this.constructor.name;
  }

  constructor(scope: Scope, selector: SelectorLike, options: ComponentOptions = {}) {
    this.locator = resolveLocator(scope, selector, options);
    this.name = options.name ?? describeSelector(selector);
    this.options = { autoScroll: true, waitForStable: false, ...options };
    this.log = createLogger(this.componentType);
  }

  /* ---------------------------------------------------------------------- */
  /* Identity                                                                */
  /* ---------------------------------------------------------------------- */

  get page(): Page {
    return this.locator.page();
  }

  /** Default timeout for this component's actions. */
  protected get timeout(): number {
    return this.options.timeout ?? config.timeouts.action;
  }

  /** Human label used in step titles: `Button "Submit"`. */
  protected get label(): string {
    return `${this.componentType} "${this.name}"`;
  }

  /** Narrows to the nth match (1-based) as a new component of the same type. */
  nth(position: number): this {
    const Constructor = this.constructor as new (
      scope: Scope,
      selector: SelectorLike,
      options: ComponentOptions,
    ) => this;
    return new Constructor(this.page, this.locator.nth(position - 1), {
      ...this.options,
      name: `${this.name} #${position}`,
    });
  }

  first(): this {
    return this.nth(1);
  }

  /** Narrows this component to matches containing the given text. */
  filterByText(text: string | RegExp): this {
    const Constructor = this.constructor as new (
      scope: Scope,
      selector: SelectorLike,
      options: ComponentOptions,
    ) => this;
    return new Constructor(this.page, this.locator.filter({ hasText: text }), {
      ...this.options,
      name: `${this.name} [text=${String(text)}]`,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Step wrapper                                                            */
  /* ---------------------------------------------------------------------- */

  /**
   * Runs an action inside a reported test step with structured logging and an
   * error message that names the component.
   */
  protected async step<T>(title: string, action: () => Promise<T>): Promise<T> {
    const fullTitle = `${this.label}: ${title}`;
    return test.step(fullTitle, async () => {
      const startedAt = Date.now();
      this.log.debug(fullTitle, { selector: this.describe() });
      try {
        const result = await action();
        this.log.trace(`${fullTitle} — ok`, { ms: Date.now() - startedAt });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.log.error(`${fullTitle} — failed`, { selector: this.describe(), message });
        throw new Error(`${fullTitle}\n  selector: ${this.describe()}\n  cause: ${message}`, {
          cause: error,
        });
      }
    });
  }

  describe(): string {
    return this.locator.toString();
  }

  /* ---------------------------------------------------------------------- */
  /* Pre-action hygiene                                                      */
  /* ---------------------------------------------------------------------- */

  /**
   * Brings the element into a state where interaction is meaningful:
   * attached, scrolled into view and — when requested — geometrically settled.
   */
  protected async prepare(): Promise<void> {
    await this.locator.waitFor({ state: 'visible', timeout: this.timeout });
    if (this.options.autoScroll) {
      await this.locator.scrollIntoViewIfNeeded({ timeout: this.timeout });
    }
    if (this.options.waitForStable) {
      await this.waitForStable();
    }
  }

  /** Waits until the bounding box stops moving — for animated or lazy content. */
  async waitForStable(timeout = TIMEOUTS.SHORT): Promise<void> {
    const deadline = Date.now() + timeout;
    let previous = await this.locator.boundingBox();
    while (Date.now() < deadline) {
      await this.page.waitForTimeout(TIMEOUTS.POLL_INTERVAL / 2);
      const current = await this.locator.boundingBox();
      if (
        previous &&
        current &&
        previous.x === current.x &&
        previous.y === current.y &&
        previous.width === current.width &&
        previous.height === current.height
      ) {
        return;
      }
      previous = current;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Core interactions                                                       */
  /* ---------------------------------------------------------------------- */

  async click(options: ClickOptions = {}): Promise<void> {
    await this.step('click', async () => {
      await this.prepare();
      await this.locator.click({ timeout: this.timeout, ...options });
    });
  }

  async doubleClick(options: ClickOptions = {}): Promise<void> {
    await this.step('double click', async () => {
      await this.prepare();
      await this.locator.dblclick({ timeout: this.timeout, ...options });
    });
  }

  async rightClick(options: ClickOptions = {}): Promise<void> {
    await this.step('right click', async () => {
      await this.prepare();
      await this.locator.click({ button: 'right', timeout: this.timeout, ...options });
    });
  }

  /**
   * Dispatches a DOM click that bypasses actionability checks.
   * Escape hatch for overlays you cannot dismiss — prefer `click()`.
   */
  async forceClick(): Promise<void> {
    await this.step('force click (dispatched)', async () => {
      await this.locator.dispatchEvent('click', undefined, { timeout: this.timeout });
    });
  }

  async hover(): Promise<void> {
    await this.step('hover', async () => {
      await this.prepare();
      await this.locator.hover({ timeout: this.timeout });
    });
  }

  async focus(): Promise<void> {
    await this.step('focus', async () => {
      await this.locator.focus({ timeout: this.timeout });
    });
  }

  async blur(): Promise<void> {
    await this.step('blur', async () => {
      await this.locator.blur({ timeout: this.timeout });
    });
  }

  async scrollIntoView(): Promise<void> {
    await this.step('scroll into view', async () => {
      await this.locator.scrollIntoViewIfNeeded({ timeout: this.timeout });
    });
  }

  async pressKey(key: string): Promise<void> {
    await this.step(`press "${key}"`, async () => {
      await this.locator.press(key, { timeout: this.timeout });
    });
  }

  async dragTo(target: BaseComponent | Locator): Promise<void> {
    const targetLocator = target instanceof BaseComponent ? target.locator : target;
    await this.step('drag to target', async () => {
      await this.prepare();
      await this.locator.dragTo(targetLocator, { timeout: this.timeout });
    });
  }

  /* ---------------------------------------------------------------------- */
  /* State inspection                                                        */
  /* ---------------------------------------------------------------------- */

  async isVisible(): Promise<boolean> {
    return this.locator.isVisible();
  }

  async isHidden(): Promise<boolean> {
    return this.locator.isHidden();
  }

  async isEnabled(): Promise<boolean> {
    return this.locator.isEnabled();
  }

  async isDisabled(): Promise<boolean> {
    return this.locator.isDisabled();
  }

  async isEditable(): Promise<boolean> {
    return this.locator.isEditable();
  }

  async isChecked(): Promise<boolean> {
    return this.locator.isChecked();
  }

  async isFocused(): Promise<boolean> {
    return this.locator.evaluate((element) => element === document.activeElement);
  }

  async exists(): Promise<boolean> {
    return (await this.locator.count()) > 0;
  }

  async count(): Promise<number> {
    return this.locator.count();
  }

  async getText(): Promise<string> {
    return normalizeText(await this.locator.innerText());
  }

  async getTextContent(): Promise<string> {
    return normalizeText(await this.locator.textContent());
  }

  async getAllTexts(): Promise<string[]> {
    return (await this.locator.allInnerTexts()).map(normalizeText);
  }

  /**
   * Raw value of a form control. Named `getInputValue` rather than `getValue`
   * so components whose value is not a string (Slider, ProgressBar) can define
   * a correctly-typed `getValue()` without fighting this signature.
   */
  async getInputValue(): Promise<string> {
    return this.locator.inputValue({ timeout: this.timeout });
  }

  async getAttribute(attribute: string): Promise<string | null> {
    return this.locator.getAttribute(attribute, { timeout: this.timeout });
  }

  async hasAttribute(attribute: string): Promise<boolean> {
    return (await this.getAttribute(attribute)) !== null;
  }

  async getCssValue(property: string): Promise<string> {
    return this.locator.evaluate(
      (element, prop) => window.getComputedStyle(element).getPropertyValue(prop),
      property,
    );
  }

  async hasClass(className: string): Promise<boolean> {
    const classes = (await this.getAttribute('class')) ?? '';
    return classes.split(/\s+/).includes(className);
  }

  async getBoundingBox(): Promise<BoundingBox | null> {
    return this.locator.boundingBox();
  }

  /** Accessible name as computed by the browser — what a screen reader announces. */
  async getAccessibleName(): Promise<string> {
    return normalizeText(
      await this.locator.evaluate((element) => {
        const labelled = element.getAttribute('aria-labelledby');
        if (labelled) {
          return labelled
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? '')
            .join(' ');
        }
        return (
          element.getAttribute('aria-label') ??
          (element as HTMLElement).innerText ??
          element.textContent ??
          ''
        );
      }),
    );
  }

  async getAriaRole(): Promise<string | null> {
    return this.getAttribute('role');
  }

  /** One-shot snapshot of everything observable — invaluable in failure output. */
  async getState(): Promise<ElementState> {
    if (!(await this.exists())) {
      return {
        exists: false,
        visible: false,
        enabled: false,
        editable: false,
        checked: null,
        focused: false,
        text: '',
        value: null,
        boundingBox: null,
        attributes: {},
      };
    }

    const [visible, text, boundingBox, attributes] = await Promise.all([
      this.locator.isVisible(),
      this.locator.textContent().catch(() => ''),
      this.locator.boundingBox(),
      this.getAllAttributes(),
    ]);

    const enabled = await this.locator.isEnabled().catch(() => false);
    const editable = await this.locator.isEditable().catch(() => false);
    const checked = await this.locator.isChecked().catch(() => null);
    const focused = await this.isFocused().catch(() => false);
    const value = await this.locator.inputValue().catch(() => null);

    return {
      exists: true,
      visible,
      enabled,
      editable,
      checked,
      focused,
      text: normalizeText(text),
      value,
      boundingBox,
      attributes,
    };
  }

  async getAllAttributes(): Promise<Record<string, string>> {
    return this.locator.evaluate((element) =>
      Object.fromEntries(Array.from(element.attributes).map((a) => [a.name, a.value])),
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Waits                                                                   */
  /* ---------------------------------------------------------------------- */

  async waitForVisible(timeout = this.timeout): Promise<void> {
    await this.locator.waitFor({ state: 'visible', timeout });
  }

  async waitForHidden(timeout = this.timeout): Promise<void> {
    await this.locator.waitFor({ state: 'hidden', timeout });
  }

  async waitForAttached(timeout = this.timeout): Promise<void> {
    await this.locator.waitFor({ state: 'attached', timeout });
  }

  async waitForDetached(timeout = this.timeout): Promise<void> {
    await this.locator.waitFor({ state: 'detached', timeout });
  }

  async waitForEnabled(timeout = this.timeout): Promise<void> {
    await expect(this.locator, `${this.label} should become enabled`).toBeEnabled({ timeout });
  }

  async waitForText(text: string | RegExp, timeout = this.timeout): Promise<void> {
    await expect(this.locator, `${this.label} should contain text`).toContainText(text, {
      timeout,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Assertions (thin, named wrappers over web-first expect)                 */
  /* ---------------------------------------------------------------------- */

  async expectVisible(timeout = this.timeout): Promise<void> {
    await expect(this.locator, `${this.label} should be visible`).toBeVisible({ timeout });
  }

  async expectHidden(timeout = this.timeout): Promise<void> {
    await expect(this.locator, `${this.label} should be hidden`).toBeHidden({ timeout });
  }

  async expectEnabled(timeout = this.timeout): Promise<void> {
    await expect(this.locator, `${this.label} should be enabled`).toBeEnabled({ timeout });
  }

  async expectDisabled(timeout = this.timeout): Promise<void> {
    await expect(this.locator, `${this.label} should be disabled`).toBeDisabled({ timeout });
  }

  async expectText(expected: string | RegExp, timeout = this.timeout): Promise<void> {
    await expect(this.locator, `${this.label} should have text`).toHaveText(expected, { timeout });
  }

  async expectContainsText(expected: string | RegExp, timeout = this.timeout): Promise<void> {
    await expect(this.locator, `${this.label} should contain text`).toContainText(expected, {
      timeout,
    });
  }

  async expectValue(expected: string | RegExp, timeout = this.timeout): Promise<void> {
    await expect(this.locator, `${this.label} should have value`).toHaveValue(expected, {
      timeout,
    });
  }

  async expectAttribute(attribute: string, expected: string | RegExp): Promise<void> {
    await expect(this.locator, `${this.label} should have @${attribute}`).toHaveAttribute(
      attribute,
      expected,
      { timeout: this.timeout },
    );
  }

  async expectCount(expected: number): Promise<void> {
    await expect(this.locator, `${this.label} should match ${expected} element(s)`).toHaveCount(
      expected,
      { timeout: this.timeout },
    );
  }

  async expectFocused(): Promise<void> {
    await expect(this.locator, `${this.label} should be focused`).toBeFocused({
      timeout: this.timeout,
    });
  }

  /* ---------------------------------------------------------------------- */
  /* Diagnostics                                                             */
  /* ---------------------------------------------------------------------- */

  /** Draws a temporary outline — useful when debugging headed runs. */
  async highlight(durationMs = 1000): Promise<void> {
    await this.locator.evaluate((element, duration) => {
      const htmlElement = element as HTMLElement;
      const previous = htmlElement.style.outline;
      htmlElement.style.outline = '3px solid #ff3b30';
      setTimeout(() => {
        htmlElement.style.outline = previous;
      }, duration);
    }, durationMs);
  }

  async screenshot(name?: string): Promise<Buffer> {
    const buffer = await this.locator.screenshot({ timeout: this.timeout });
    if (name) {
      await test.info().attach(name, { body: buffer, contentType: 'image/png' });
    }
    return buffer;
  }

  async innerHTML(): Promise<string> {
    return this.locator.innerHTML();
  }
}

function describeSelector(selector: SelectorLike): string {
  if (typeof selector === 'string') return selector;
  if (typeof selector === 'function') return 'derived locator';
  return selector.toString();
}
