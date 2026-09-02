import type { Locator } from '@playwright/test';
import { BaseComponent } from '../../core/base.component';
import { normalizeText } from '../../utils/string.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface RichTextEditorOptions extends ComponentOptions {
  /** The contenteditable body when it differs from the wrapper. */
  editableSelector?: string;
  toolbarSelector?: string;
  /** Editors like TinyMCE render inside an iframe. */
  iframeSelector?: string;
}

/**
 * WYSIWYG editor (Quill, TinyMCE, CKEditor, ProseMirror, Slate).
 *
 * Asserting on rendered HTML is what makes these tests meaningful — plain
 * text hides every formatting bug.
 */
export class RichTextEditor extends BaseComponent {
  private readonly editableSelector: string;
  private readonly toolbarSelector: string;

  protected override get componentType(): string {
    return 'RichTextEditor';
  }

  constructor(scope: Scope, selector: SelectorLike, options: RichTextEditorOptions = {}) {
    super(scope, selector, {
      ...options,
      ...(options.iframeSelector ? { frameSelector: options.iframeSelector } : {}),
    });
    this.editableSelector =
      options.editableSelector ?? '[contenteditable="true"], .ql-editor, body';
    this.toolbarSelector = options.toolbarSelector ?? '.toolbar, .ql-toolbar, [role="toolbar"]';
  }

  private get editable(): Locator {
    const inner = this.locator.locator(this.editableSelector);
    return inner;
  }

  private async body(): Promise<Locator> {
    return (await this.editable.count()) > 0 ? this.editable.first() : this.locator;
  }

  async typeText(text: string): Promise<void> {
    await this.step(`type "${text.slice(0, 40)}"`, async () => {
      const body = await this.body();
      await body.click({ timeout: this.timeout });
      await body.pressSequentially(text, { delay: 10 });
    });
  }

  async setContent(text: string): Promise<void> {
    await this.step('replace content', async () => {
      const body = await this.body();
      await body.click({ timeout: this.timeout });
      await this.page.keyboard.press('ControlOrMeta+a');
      await this.page.keyboard.press('Delete');
      await body.pressSequentially(text, { delay: 10 });
    });
  }

  async clear(): Promise<void> {
    await this.setContent('');
  }

  async getText(): Promise<string> {
    const body = await this.body();
    return normalizeText(await body.innerText());
  }

  /** The generated markup — where formatting assertions actually live. */
  async getHtml(): Promise<string> {
    const body = await this.body();
    return body.innerHTML();
  }

  /** Selects all text so a toolbar action applies to the whole document. */
  async selectAll(): Promise<void> {
    const body = await this.body();
    await body.click({ timeout: this.timeout });
    await this.page.keyboard.press('ControlOrMeta+a');
  }

  /** Selects a specific substring using the browser's Range API. */
  async selectText(text: string): Promise<void> {
    await this.step(`select "${text}"`, async () => {
      const body = await this.body();
      await body.evaluate((element, needle) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          const index = node.textContent?.indexOf(needle) ?? -1;
          if (index !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + needle.length);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            return;
          }
          node = walker.nextNode();
        }
        throw new Error(`Text "${needle}" not found in the editor`);
      }, text);
    });
  }

  /** Applies a toolbar action to the current selection. */
  async clickToolbarButton(name: string): Promise<void> {
    await this.step(`toolbar: ${name}`, async () => {
      const toolbar = this.page.locator(this.toolbarSelector).first();
      const button = toolbar
        .locator(`[aria-label*="${name}" i], [title*="${name}" i], .ql-${name.toLowerCase()}`)
        .first();
      await button.click({ timeout: this.timeout });
    });
  }

  async bold(): Promise<void> {
    await this.applyShortcut('ControlOrMeta+b');
  }

  async italic(): Promise<void> {
    await this.applyShortcut('ControlOrMeta+i');
  }

  async underline(): Promise<void> {
    await this.applyShortcut('ControlOrMeta+u');
  }

  /** True when the selection is wrapped in the given tag. */
  async hasFormatting(tag: 'b' | 'strong' | 'i' | 'em' | 'u'): Promise<boolean> {
    const html = await this.getHtml();
    return new RegExp(`<${tag}[ >]`, 'i').test(html);
  }

  async getWordCount(): Promise<number> {
    const text = await this.getText();
    return text.split(/\s+/).filter(Boolean).length;
  }

  async isEmpty(): Promise<boolean> {
    return (await this.getText()).trim() === '';
  }

  private async applyShortcut(shortcut: string): Promise<void> {
    await this.step(`apply ${shortcut}`, async () => {
      await this.page.keyboard.press(shortcut);
    });
  }
}
