/** Downloads rows as a CSV file (UTF-8 with BOM so Excel keeps Bangla text). */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const text = `﻿${rows.map((r) => r.map(cell).join(',')).join('\n')}`;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/** Paisa as plain taka for spreadsheets. */
export const takaCell = (paisa: number) => (paisa / 100).toFixed(2);
