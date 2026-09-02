/** ISO date portion only: 2026-08-31 */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Formats a date with a token string: YYYY, MM, DD, HH, mm, ss, MMM, MMMM, D, M.
 * Deliberately dependency-free and locale-independent.
 */
export function format(date: Date, pattern = 'YYYY-MM-DD'): string {
  const monthsLong = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const pad = (n: number): string => String(n).padStart(2, '0');
  const monthIndex = date.getMonth();
  const longMonth = monthsLong[monthIndex] ?? '';

  const replacements: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MMMM: longMonth,
    MMM: longMonth.slice(0, 3),
    MM: pad(monthIndex + 1),
    M: String(monthIndex + 1),
    DD: pad(date.getDate()),
    D: String(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };

  return pattern.replace(
    /YYYY|YY|MMMM|MMM|MM|M|DD|D|HH|mm|ss/g,
    (token) => replacements[token] ?? token,
  );
}

/** Human-readable elapsed time, for logs and reports. */
export function humanizeDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000) % 60;
  const hours = Math.floor(ms / 3_600_000);
  const parts = [hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}m` : '', `${seconds}s`];
  return parts.filter(Boolean).join(' ');
}
