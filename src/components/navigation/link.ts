import type { Page } from '@playwright/test';
import { BaseComponent } from '../../core/base.component';

/** Anchor element, including download and new-tab behaviours. */
export class Link extends BaseComponent {
  protected override get componentType(): string {
    return 'Link';
  }

  async getHref(): Promise<string | null> {
    return this.getAttribute('href');
  }

  async getTarget(): Promise<string | null> {
    return this.getAttribute('target');
  }

  async opensInNewTab(): Promise<boolean> {
    return (await this.getTarget()) === '_blank';
  }

  /** Clicks and waits for the URL to change. */
  async clickAndWait(expectedUrl?: string | RegExp): Promise<void> {
    await this.step('click and wait for navigation', async () => {
      await this.prepare();
      await Promise.all([
        expectedUrl
          ? this.page.waitForURL(expectedUrl, { timeout: this.timeout })
          : this.page.waitForLoadState('domcontentloaded'),
        this.locator.click({ timeout: this.timeout }),
      ]);
    });
  }

  /** Follows a `target="_blank"` link and returns the new tab. */
  async clickAndGetNewTab(): Promise<Page> {
    return this.step('click and capture new tab', async () => {
      const context = this.page.context();
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: this.timeout }),
        this.locator.click({ timeout: this.timeout }),
      ]);
      await newPage.waitForLoadState('domcontentloaded');
      return newPage;
    });
  }

  /** Verifies the target resolves without leaving the page — cheap link checking. */
  async isReachable(): Promise<boolean> {
    const href = await this.getHref();
    if (!href) return false;
    const absolute = new URL(href, this.page.url()).toString();
    const response = await this.page.request.head(absolute).catch(() => null);
    return response !== null && response.status() < 400;
  }

  async isExternal(): Promise<boolean> {
    const href = await this.getHref();
    if (!href) return false;
    try {
      return new URL(href, this.page.url()).host !== new URL(this.page.url()).host;
    } catch {
      return false;
    }
  }
}
