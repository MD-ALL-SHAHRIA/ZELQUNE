import { type EmailMessage } from './email.provider';

export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export interface EmailContent {
  to: string;
  lang: 'en' | 'bn';
  subject: string;
  /** Paragraphs above the table. */
  lines: string[];
  /** Label / value rows (items, totals, address). A row with an empty label is a divider. */
  rows?: [string, string][];
  /** Shown bold under the rows (e.g. the total). */
  total?: [string, string];
  button?: { label: string; url: string };
  foot: string;
}

/**
 * The one Zelqune email look: cream page, a white card with the wordmark, espresso button,
 * muted footer. Table layout and inline styles only, so it renders in Gmail and Outlook alike.
 */
export function renderEmail(c: EmailContent): EmailMessage {
  const rows = c.rows ?? [];
  const table = rows.length
    ? `<tr><td style="padding:4px 32px 8px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5">${rows
        .map(([k, v]) =>
          k
            ? `<tr><td style="padding:6px 0;color:#7A6A5F">${esc(k)}</td><td align="right" style="padding:6px 0">${esc(v)}</td></tr>`
            : `<tr><td colspan="2" style="border-top:1px solid #E6DCCD;padding:0;height:8px"></td></tr>`,
        )
        .join('')}${
        c.total
          ? `<tr><td style="padding:10px 0 0;border-top:1px solid #E6DCCD;font-weight:bold">${esc(c.total[0])}</td><td align="right" style="padding:10px 0 0;border-top:1px solid #E6DCCD;font-weight:bold">${esc(c.total[1])}</td></tr>`
          : ''
      }</table></td></tr>`
    : '';
  const button = c.button
    ? `<tr><td style="padding:16px 32px 24px"><a href="${esc(c.button.url)}" style="display:inline-block;background:#3B2922;color:#F7F1E8;text-decoration:none;padding:14px 26px;font-size:14px;letter-spacing:1px">${esc(c.button.label)}</a>
<p style="margin:16px 0 0;font-size:12px;color:#7A6A5F;word-break:break-all">${esc(c.button.url)}</p></td></tr>`
    : '';
  const html = `<!doctype html><html lang="${c.lang}"><body style="margin:0;background:#F7F1E8;font-family:Arial,Helvetica,sans-serif;color:#3B2922">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#FFFDF9;border:1px solid #E6DCCD" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 32px 8px;font-family:Georgia,serif;font-size:22px;letter-spacing:6px">ZELQUNE</td></tr>
<tr><td style="padding:8px 32px 0;font-size:16px;line-height:1.6">${c.lines.map((l) => `<p style="margin:0 0 14px">${esc(l)}</p>`).join('')}</td></tr>
${table}${button}<tr><td style="padding:16px 32px 28px;border-top:1px solid #E6DCCD;font-size:13px;color:#7A6A5F">${esc(c.foot)}</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    ...c.lines,
    ...(rows.length ? ['', ...rows.filter(([k]) => k).map(([k, v]) => `${k}: ${v}`)] : []),
    ...(c.total ? [`${c.total[0]}: ${c.total[1]}`] : []),
    ...(c.button ? ['', `${c.button.label}: ${c.button.url}`] : []),
    '',
    c.foot,
    '',
    'Zelqune',
  ].join('\n');
  return { to: c.to, subject: c.subject, html, text };
}
