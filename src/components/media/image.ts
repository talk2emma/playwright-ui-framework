import { BaseComponent } from '../../core/base.component';

/** `<img>` — including the load-failure and lazy-loading cases. */
export class Image extends BaseComponent {
  protected override get componentType(): string {
    return 'Image';
  }

  async getSrc(): Promise<string | null> {
    return this.getAttribute('src');
  }

  async getAlt(): Promise<string | null> {
    return this.getAttribute('alt');
  }

  /** True once the browser has decoded the bitmap — not merely "element visible". */
  async isLoaded(): Promise<boolean> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLImageElement ? element.complete && element.naturalWidth > 0 : false,
    );
  }

  async waitForLoaded(timeout = this.timeout): Promise<void> {
    await this.step('wait for image to load', async () => {
      await this.locator.waitFor({ state: 'visible', timeout });
      await this.page.waitForFunction(
        (selector) => {
          const image = document.querySelector(selector);
          return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
        },
        await this.cssSelector(),
        { timeout },
      );
    });
  }

  /** Intrinsic pixel dimensions — catches wrong-asset and stretched-image bugs. */
  async getNaturalSize(): Promise<{ width: number; height: number }> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLImageElement
        ? { width: element.naturalWidth, height: element.naturalHeight }
        : { width: 0, height: 0 },
    );
  }

  async isBroken(): Promise<boolean> {
    return !(await this.isLoaded());
  }

  async isLazyLoaded(): Promise<boolean> {
    return (await this.getAttribute('loading')) === 'lazy';
  }

  /** srcset entries, for responsive-image coverage. */
  async getSrcSet(): Promise<string[]> {
    const srcset = await this.getAttribute('srcset');
    return srcset ? srcset.split(',').map((entry) => entry.trim()) : [];
  }

  /** Decorative images must have empty alt; meaningful ones must have text. */
  async hasAccessibleAlt(): Promise<boolean> {
    const [alt, role] = await Promise.all([this.getAttribute('alt'), this.getAttribute('role')]);
    if (role === 'presentation' || role === 'none') return alt === '' || alt === null;
    return alt !== null && alt.trim() !== '';
  }

  private async cssSelector(): Promise<string> {
    const id = await this.getAttribute('id');
    if (id) return `#${id}`;
    const src = await this.getSrc();
    return src ? `img[src="${src}"]` : 'img';
  }
}
