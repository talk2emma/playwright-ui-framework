import { TextInput } from './text-input';

/** Multi-line text field. Inherits validation handling from TextInput. */
export class TextArea extends TextInput {
  protected override get componentType(): string {
    return 'TextArea';
  }

  async getRowCount(): Promise<number> {
    const rows = await this.getAttribute('rows');
    return rows === null ? 2 : Number(rows);
  }

  /** Number of characters currently entered — for counter/limit assertions. */
  async getCharacterCount(): Promise<number> {
    return (await this.getValue()).length;
  }

  /** Enters multi-line content, using Shift+Enter where Enter would submit. */
  async typeLines(lines: string[], newlineKey: 'Enter' | 'Shift+Enter' = 'Enter'): Promise<void> {
    await this.step(`type ${lines.length} line(s)`, async () => {
      await this.prepare();
      await this.locator.fill('');
      for (const [index, line] of lines.entries()) {
        await this.locator.pressSequentially(line, { delay: 10 });
        if (index < lines.length - 1) await this.locator.press(newlineKey);
      }
    });
  }

  async isResizable(): Promise<boolean> {
    return (await this.getCssValue('resize')) !== 'none';
  }
}
