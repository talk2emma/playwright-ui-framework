import path from 'node:path';
import { BaseComponent } from '../../core/base.component';
import { TIMEOUTS } from '../../config/timeouts';
import { resolveDataPath } from '../../utils/file.utils';
import type { ComponentOptions, SelectorLike } from '../../types';
import type { Scope } from '../../core/locator.factory';

export interface FileUploadOptions extends ComponentOptions {
  /** The visible button/zone when the real input is hidden. */
  triggerSelector?: string;
  /** Rendered list of accepted files. */
  fileListSelector?: string;
  progressSelector?: string;
  errorSelector?: string;
  removeSelector?: string;
}

/**
 * File upload in all three flavours: a plain `<input type="file">`, a hidden
 * input behind a styled button, and a drag-and-drop zone.
 */
export class FileUpload extends BaseComponent {
  private readonly triggerSelector: string | undefined;
  private readonly fileListSelector: string;
  private readonly progressSelector: string;
  private readonly errorSelector: string;
  private readonly removeSelector: string;

  protected override get componentType(): string {
    return 'FileUpload';
  }

  constructor(scope: Scope, selector: SelectorLike, options: FileUploadOptions = {}) {
    super(scope, selector, options);
    this.triggerSelector = options.triggerSelector;
    this.fileListSelector = options.fileListSelector ?? '.file-list, [data-testid="file-list"]';
    this.progressSelector = options.progressSelector ?? '[role="progressbar"], .upload-progress';
    this.errorSelector = options.errorSelector ?? '.upload-error, [role="alert"]';
    this.removeSelector = options.removeSelector ?? '[aria-label*="remove" i], .remove-file';
  }

  /** Sets files directly on the input — works even when the input is hidden. */
  async upload(files: string | string[]): Promise<void> {
    const list = (Array.isArray(files) ? files : [files]).map(resolveDataPath);
    await this.step(`upload ${list.map((f) => path.basename(f)).join(', ')}`, async () => {
      await this.locator.setInputFiles(list, { timeout: this.timeout });
    });
  }

  /**
   * Uploads through the file chooser dialog — exercises the real user path
   * when clicking a styled button opens the OS picker.
   */
  async uploadViaFileChooser(files: string | string[]): Promise<void> {
    const list = (Array.isArray(files) ? files : [files]).map(resolveDataPath);
    await this.step(`upload via file chooser (${list.length} file(s))`, async () => {
      const trigger = this.triggerSelector ? this.page.locator(this.triggerSelector) : this.locator;
      const [chooser] = await Promise.all([
        this.page.waitForEvent('filechooser', { timeout: this.timeout }),
        trigger.click({ timeout: this.timeout }),
      ]);
      await chooser.setFiles(list);
    });
  }

  /** Uploads an in-memory buffer without touching disk. */
  async uploadBuffer(fileName: string, mimeType: string, buffer: Buffer): Promise<void> {
    await this.step(`upload buffer "${fileName}"`, async () => {
      await this.locator.setInputFiles(
        { name: fileName, mimeType, buffer },
        { timeout: this.timeout },
      );
    });
  }

  /** Simulates a drag-and-drop onto the zone by dispatching a DataTransfer drop. */
  async dropFile(fileName: string, mimeType: string, content: string): Promise<void> {
    await this.step(`drop file "${fileName}"`, async () => {
      const dataTransfer = await this.page.evaluateHandle(
        ({ name, type, data }) => {
          const transfer = new DataTransfer();
          transfer.items.add(new File([data], name, { type }));
          return transfer;
        },
        { name: fileName, type: mimeType, data: content },
      );
      await this.locator.dispatchEvent('dragenter', { dataTransfer });
      await this.locator.dispatchEvent('dragover', { dataTransfer });
      await this.locator.dispatchEvent('drop', { dataTransfer });
    });
  }

  async clearFiles(): Promise<void> {
    await this.step('clear selected files', async () => {
      await this.locator.setInputFiles([], { timeout: this.timeout });
    });
  }

  async getSelectedFileNames(): Promise<string[]> {
    return this.locator.evaluate((element) =>
      element instanceof HTMLInputElement && element.files
        ? Array.from(element.files).map((file) => file.name)
        : [],
    );
  }

  /** File names as rendered by the application's own file list. */
  async getUploadedFileNames(): Promise<string[]> {
    const list = this.page.locator(this.fileListSelector);
    if ((await list.count()) === 0) return [];
    return (await list.first().locator('li, .file-item').allInnerTexts()).map((t) => t.trim());
  }

  async waitForUploadComplete(timeout = TIMEOUTS.EXTRA_LONG): Promise<void> {
    await this.step('wait for upload to complete', async () => {
      const progress = this.page.locator(this.progressSelector).first();
      await progress.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT }).catch(() => undefined);
      await progress.waitFor({ state: 'hidden', timeout }).catch(() => undefined);
    });
  }

  async getUploadProgress(): Promise<number> {
    const progress = this.page.locator(this.progressSelector).first();
    const value = await progress.getAttribute('aria-valuenow').catch(() => null);
    return value === null ? 0 : Number(value);
  }

  async getErrorMessage(): Promise<string> {
    const error = this.page.locator(this.errorSelector).first();
    return (await error.count()) > 0 ? (await error.innerText()).trim() : '';
  }

  async removeFile(fileName: string): Promise<void> {
    await this.step(`remove "${fileName}"`, async () => {
      const row = this.page
        .locator(this.fileListSelector)
        .locator('li, .file-item')
        .filter({ hasText: fileName })
        .first();
      await row.locator(this.removeSelector).first().click({ timeout: this.timeout });
    });
  }

  /** The `accept` attribute, split into a list of allowed types. */
  async getAcceptedTypes(): Promise<string[]> {
    const accept = await this.getAttribute('accept');
    return accept ? accept.split(',').map((type) => type.trim()) : [];
  }

  async allowsMultiple(): Promise<boolean> {
    return (await this.getAttribute('multiple')) !== null;
  }
}
