/**
 * Minimal ambient types for `xlsx-populate`, which ships no declarations.
 * Only the surface the framework uses is declared.
 */
declare module 'xlsx-populate' {
  export interface Range {
    value(): unknown[][];
  }
  export interface Sheet {
    name(): string;
    usedRange(): Range | undefined;
  }
  export interface Workbook {
    sheet(nameOrIndex: string | number): Sheet | undefined;
    sheets(): Sheet[];
  }
  const XlsxPopulate: {
    fromFileAsync(path: string): Promise<Workbook>;
  };
  export default XlsxPopulate;
}
