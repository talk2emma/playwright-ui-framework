import { BaseComponent } from '../../core/base.component';

export interface Point {
  x: number;
  y: number;
}

/**
 * `<canvas>` — signature pads, drawing tools, charts and games.
 *
 * Canvas has no DOM to query, so everything here is coordinate- or
 * pixel-based. Coordinates are relative to the canvas's top-left corner.
 */
export class Canvas extends BaseComponent {
  protected override get componentType(): string {
    return 'Canvas';
  }

  private async origin(): Promise<Point> {
    const box = await this.getBoundingBox();
    if (!box) throw new Error(`${this.label} has no bounding box`);
    return { x: box.x, y: box.y };
  }

  /** Draws a continuous stroke through the given points. */
  async draw(points: Point[]): Promise<void> {
    await this.step(`draw a ${points.length}-point stroke`, async () => {
      if (points.length < 2) throw new Error('A stroke needs at least two points');
      const origin = await this.origin();
      const [first, ...rest] = points;
      await this.page.mouse.move(origin.x + first!.x, origin.y + first!.y);
      await this.page.mouse.down();
      for (const point of rest) {
        await this.page.mouse.move(origin.x + point.x, origin.y + point.y, { steps: 4 });
      }
      await this.page.mouse.up();
    });
  }

  async clickAt(point: Point): Promise<void> {
    await this.step(`click at (${point.x}, ${point.y})`, async () => {
      await this.locator.click({ position: point, timeout: this.timeout });
    });
  }

  async hoverAt(point: Point): Promise<void> {
    await this.step(`hover at (${point.x}, ${point.y})`, async () => {
      await this.locator.hover({ position: point, timeout: this.timeout });
    });
  }

  /** Draws a straight line — the simplest signature-pad interaction. */
  async drawLine(from: Point, to: Point): Promise<void> {
    await this.draw([from, to]);
  }

  /** Draws a scribble that reliably produces non-blank canvas content. */
  async scribble(): Promise<void> {
    const box = await this.getBoundingBox();
    if (!box) throw new Error(`${this.label} has no bounding box`);
    const points: Point[] = Array.from({ length: 12 }, (_, index) => ({
      x: (box.width / 12) * index,
      y: box.height / 2 + Math.sin(index) * (box.height / 4),
    }));
    await this.draw(points);
  }

  /** RGBA of one pixel — verifies something was actually drawn. */
  async getPixelColor(point: Point): Promise<[number, number, number, number]> {
    return this.locator.evaluate((element, coords) => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error('Not a canvas element');
      const context = element.getContext('2d');
      if (!context) throw new Error('No 2d context available');
      const data = context.getImageData(coords.x, coords.y, 1, 1).data;
      return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0, data[3] ?? 0] as [
        number,
        number,
        number,
        number,
      ];
    }, point);
  }

  /** True when every pixel is fully transparent. */
  async isBlank(): Promise<boolean> {
    return this.locator.evaluate((element) => {
      if (!(element instanceof HTMLCanvasElement)) return true;
      const context = element.getContext('2d');
      if (!context) return true;
      const { data } = context.getImageData(0, 0, element.width, element.height);
      for (let index = 3; index < data.length; index += 4) {
        if ((data[index] ?? 0) !== 0) return false;
      }
      return true;
    });
  }

  /** Canvas contents as a data URL — usable as a visual baseline. */
  async toDataUrl(): Promise<string> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLCanvasElement ? element.toDataURL() : '',
    );
  }

  async getDimensions(): Promise<{ width: number; height: number }> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLCanvasElement
        ? { width: element.width, height: element.height }
        : { width: 0, height: 0 },
    );
  }
}
