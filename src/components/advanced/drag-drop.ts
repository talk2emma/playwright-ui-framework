import { BaseComponent } from '../../core/base.component';
import type { Locator } from '@playwright/test';

interface DragOptions {
  /** Number of intermediate mouse moves. More steps = more HTML5 events fired. */
  steps?: number;
  /** Pause at the source before moving — some libraries need a hold to start. */
  holdMs?: number;
  /** Drop position inside the target, relative to its top-left. */
  targetPosition?: { x: number; y: number };
}

/**
 * Draggable element.
 *
 * Provides three strategies because no single one works everywhere:
 *  - `dragTo`      — Playwright's built-in; works for most HTML5 DnD.
 *  - `dragManually`— explicit mouse steps; needed by react-dnd, dnd-kit, Sortable.
 *  - `dragWithDataTransfer` — synthetic events; last resort for custom handlers.
 */
export class Draggable extends BaseComponent {
  protected override get componentType(): string {
    return 'Draggable';
  }

  async isDraggable(): Promise<boolean> {
    const [attribute, ariaGrabbed] = await Promise.all([
      this.getAttribute('draggable'),
      this.getAttribute('aria-grabbed'),
    ]);
    return attribute === 'true' || ariaGrabbed !== null;
  }

  /** Mouse-driven drag with explicit steps — the most broadly compatible path. */
  async dragManually(target: BaseComponent | Locator, options: DragOptions = {}): Promise<void> {
    const targetLocator = target instanceof BaseComponent ? target.locator : target;
    await this.step('drag manually to target', async () => {
      const [sourceBox, targetBox] = await Promise.all([
        this.locator.boundingBox(),
        targetLocator.boundingBox(),
      ]);
      if (!sourceBox || !targetBox) throw new Error(`${this.label}: source or target has no box`);

      const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
      const end = options.targetPosition
        ? { x: targetBox.x + options.targetPosition.x, y: targetBox.y + options.targetPosition.y }
        : { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

      await this.page.mouse.move(start.x, start.y);
      await this.page.mouse.down();
      if (options.holdMs) await this.page.waitForTimeout(options.holdMs);
      // An initial small move is what most libraries use to detect "drag started".
      await this.page.mouse.move(start.x + 10, start.y + 10, { steps: 5 });
      await this.page.mouse.move(end.x, end.y, { steps: options.steps ?? 20 });
      await this.page.mouse.move(end.x, end.y, { steps: 5 });
      await this.page.mouse.up();
    });
  }

  /** Dispatches a full HTML5 drag sequence with a shared DataTransfer. */
  async dragWithDataTransfer(target: BaseComponent | Locator): Promise<void> {
    const targetLocator = target instanceof BaseComponent ? target.locator : target;
    await this.step('drag with synthetic DataTransfer', async () => {
      const dataTransfer = await this.page.evaluateHandle(() => new DataTransfer());
      await this.locator.dispatchEvent('dragstart', { dataTransfer });
      await targetLocator.dispatchEvent('dragenter', { dataTransfer });
      await targetLocator.dispatchEvent('dragover', { dataTransfer });
      await targetLocator.dispatchEvent('drop', { dataTransfer });
      await this.locator.dispatchEvent('dragend', { dataTransfer });
    });
  }

  /** Moves the element by a pixel offset — for reordering and canvas layouts. */
  async dragBy(deltaX: number, deltaY: number, steps = 20): Promise<void> {
    await this.step(`drag by (${deltaX}, ${deltaY})`, async () => {
      const box = await this.locator.boundingBox();
      if (!box) throw new Error(`${this.label} has no bounding box`);
      const startX = box.x + box.width / 2;
      const startY = box.y + box.height / 2;

      await this.page.mouse.move(startX, startY);
      await this.page.mouse.down();
      await this.page.mouse.move(startX + deltaX / 2, startY + deltaY / 2, { steps });
      await this.page.mouse.move(startX + deltaX, startY + deltaY, { steps });
      await this.page.mouse.up();
    });
  }

  /** Keyboard-accessible drag: Space to lift, arrows to move, Space to drop. */
  async dragWithKeyboard(direction: 'up' | 'down' | 'left' | 'right', times = 1): Promise<void> {
    await this.step(`keyboard drag ${direction} x${times}`, async () => {
      const keyMap = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
      await this.locator.focus();
      await this.page.keyboard.press('Space');
      for (let i = 0; i < times; i++) await this.page.keyboard.press(keyMap[direction]);
      await this.page.keyboard.press('Space');
    });
  }
}

/** A drop zone: where draggables land. */
export class DropZone extends BaseComponent {
  protected override get componentType(): string {
    return 'DropZone';
  }

  /** True while the zone is highlighted as a valid target. */
  async isActive(): Promise<boolean> {
    const [className, ariaDropEffect] = await Promise.all([
      this.getAttribute('class'),
      this.getAttribute('aria-dropeffect'),
    ]);
    return /drag-over|active|droppable-hover/i.test(className ?? '') || ariaDropEffect === 'move';
  }

  async getDroppedItems(itemSelector = '.item, li, [draggable]'): Promise<string[]> {
    return (await this.locator.locator(itemSelector).allInnerTexts()).map((text) => text.trim());
  }

  async itemCount(itemSelector = '.item, li, [draggable]'): Promise<number> {
    return this.locator.locator(itemSelector).count();
  }

  async containsItem(text: string, itemSelector = '.item, li, [draggable]'): Promise<boolean> {
    return (await this.getDroppedItems(itemSelector)).some((item) => item.includes(text));
  }
}
