/** Collapses all whitespace runs to single spaces and trims — DOM text is messy. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

/** Strips everything but digits, dot and minus, then parses. Handles "$1,234.50". */
export function extractNumber(value: string | null | undefined): number {
  const cleaned = (value ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) throw new Error(`Cannot extract a number from "${value ?? ''}"`);
  return parsed;
}

export function extractNumbers(value: string | null | undefined): number[] {
  return ((value ?? '').match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
}

export function containsIgnoreCase(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function truncate(value: string, maxLength = 80): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

/** Escapes a string for safe use inside a regular expression. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Masks a secret for logging: "supersecret" -> "su*******et". */
export function mask(value: string, visible = 2): string {
  if (value.length <= visible * 2) return '*'.repeat(value.length);
  return `${value.slice(0, visible)}${'*'.repeat(value.length - visible * 2)}${value.slice(-visible)}`;
}

export function stripCurrency(value: string): string {
  return value.replace(/[^0-9.,-]/g, '').trim();
}
