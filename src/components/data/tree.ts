import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';
import type { Locator } from '@playwright/test';

export interface TreeOptions extends ComponentOptions {
  nodeSelector?: string;
  labelSelector?: string;
  toggleSelector?: string;
}

/** Tree view / file explorer — `role="tree"` with expandable `treeitem` nodes. */
export class TreeView extends BaseComponent {
  private readonly nodeSelector: string;
  private readonly labelSelector: string | undefined;
  private readonly toggleSelector: string;

  protected override get componentType(): string {
    return 'TreeView';
  }

  constructor(scope: Scope, selector: SelectorLike, options: TreeOptions = {}) {
    super(scope, selector, options);
    this.nodeSelector = options.nodeSelector ?? '[role="treeitem"], .tree-node';
    this.labelSelector = options.labelSelector;
    this.toggleSelector = options.toggleSelector ?? '.toggle, .expander, [aria-expanded]';
  }

  get nodes(): Locator {
    return this.locator.locator(this.nodeSelector);
  }

  node(label: string): Locator {
    const scoped = this.labelSelector
      ? this.nodes.filter({ has: this.page.locator(this.labelSelector, { hasText: label }) })
      : this.nodes.filter({ hasText: label });
    return scoped.first();
  }

  async expand(label: string): Promise<void> {
    await this.step(`expand "${label}"`, async () => {
      const node = this.node(label);
      await node.waitFor({ state: 'visible', timeout: this.timeout });
      if (await this.isExpanded(label)) return;
      const toggle = node.locator(this.toggleSelector).first();
      if ((await toggle.count()) > 0) await toggle.click({ timeout: this.timeout });
      else await node.click({ timeout: this.timeout });
    });
  }

  async collapse(label: string): Promise<void> {
    await this.step(`collapse "${label}"`, async () => {
      if (!(await this.isExpanded(label))) return;
      const toggle = this.node(label).locator(this.toggleSelector).first();
      await toggle.click({ timeout: this.timeout });
    });
  }

  /** Expands each ancestor in turn, then selects the leaf. */
  async expandPath(path: string[]): Promise<void> {
    await this.step(`expand path ${path.join(' / ')}`, async () => {
      for (const segment of path.slice(0, -1)) await this.expand(segment);
      const leaf = path[path.length - 1];
      if (leaf) await this.node(leaf).click({ timeout: this.timeout });
    });
  }

  async isExpanded(label: string): Promise<boolean> {
    const node = this.node(label);
    const expanded = await node.getAttribute('aria-expanded');
    if (expanded !== null) return expanded === 'true';
    const className = (await node.getAttribute('class')) ?? '';
    return /expanded|open/i.test(className);
  }

  async select(label: string): Promise<void> {
    await this.step(`select "${label}"`, async () => {
      await this.node(label).click({ timeout: this.timeout });
    });
  }

  async isSelected(label: string): Promise<boolean> {
    const node = this.node(label);
    const [selected, className] = await Promise.all([
      node.getAttribute('aria-selected'),
      node.getAttribute('class'),
    ]);
    return selected === 'true' || /selected|active/i.test(className ?? '');
  }

  /** Nesting depth via aria-level, or -1 when the tree does not expose it. */
  async getLevel(label: string): Promise<number> {
    const level = await this.node(label).getAttribute('aria-level');
    return level === null ? -1 : Number(level);
  }

  async getVisibleNodes(): Promise<string[]> {
    return (await this.nodes.allInnerTexts()).map(normalizeText).filter(Boolean);
  }

  async getChildren(parentLabel: string): Promise<string[]> {
    await this.expand(parentLabel);
    const children = this.node(parentLabel).locator(`[role="group"] ${this.nodeSelector}`);
    return (await children.allInnerTexts()).map(normalizeText).filter(Boolean);
  }

  async nodeCount(): Promise<number> {
    return this.nodes.count();
  }
}
