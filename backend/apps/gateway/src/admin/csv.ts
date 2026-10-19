/**
 * RFC 4180 CSV with protection against spreadsheet formula injection: cells starting with
 * = + - @ (or tab/CR) are prefixed with an apostrophe so Excel/Sheets treat them as text.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s =
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** UTF-8 byte order mark so Excel opens Bangla text correctly. */
const BOM = String.fromCharCode(0xfeff);

export function toCsv<T extends Record<string, unknown>>(
  columns: { key: keyof T & string; header: string }[],
  rows: T[],
): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => csvCell(row[c.key] as unknown)).join(','));
  // BOM so Excel opens UTF-8 (Bangla names) correctly
  return `${BOM}${lines.join('\r\n')}\r\n`;
}
