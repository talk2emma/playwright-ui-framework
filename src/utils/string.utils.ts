/** Collapses all whitespace runs to single spaces and trims — DOM text is messy. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}
