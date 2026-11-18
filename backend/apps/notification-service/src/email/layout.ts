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
  /** Small brass label above the heading (e.g. "Order received"). */
  eyebrow?: string;
  /** The big serif line (e.g. "Thank you, Rahim."). */
  heading?: string;
  /** Paragraphs under the heading. */
  lines: string[];
  /** Order code shown as a stamped label. */
  code?: { label: string; value: string };
  /** Order journey; `current` is the 0-based step reached. */
  progress?: { steps: string[]; current: number };
  /** Label / value rows (items, totals). A row with an empty label is a divider. */
  rows?: [string, string][];
  /** Shown bold under the rows. */
  total?: [string, string];
  /** A highlighted box (what to pay, what happens next). */
  note?: string;
  button?: { label: string; url: string };
  /** The help line ("Questions? Reply..."). */
  foot: string;
  /** Storefront base URL for the footer link; omitted for internal emails. */
  site?: string;
}

// Brand colours (packages/ui-tokens), fixed here because email clients ignore CSS variables.
const ESPRESSO = '#3B2922';
const CREAM = '#F7F1E8';
const PAPER = '#FFFDF9';
const SAND = '#F1E8DA';
const LINE = '#E6DCCD';
const STONE = '#7A6A5F';
const BRASS = '#D9B47A';
const WALNUT = '#7A5C30';

const SERIF = "Georgia,'Times New Roman',serif";
const SANS = (lang: 'en' | 'bn') =>
  lang === 'bn'
    ? "'Hind Siliguri','Noto Sans Bengali','Segoe UI',Arial,sans-serif"
    : "'Helvetica Neue',Helvetica,Arial,sans-serif";

function progressHtml(p: { steps: string[]; current: number }, sans: string): string {
  const cell = 100 / p.steps.length;
  const dots = p.steps
    .map((label, i) => {
      const done = i <= p.current;
      const now = i === p.current;
      const dot = now
        ? `background:${ESPRESSO};border:2px solid ${ESPRESSO}`
        : done
          ? `background:${BRASS};border:2px solid ${BRASS}`
          : `background:${PAPER};border:2px solid ${LINE}`;
      return `<td width="${cell}%" align="center" valign="top" style="padding:0 2px">
<div style="width:14px;height:14px;border-radius:7px;${dot};margin:0 auto"></div>
<div style="margin-top:8px;font-family:${sans};font-size:11px;line-height:1.3;color:${done ? ESPRESSO : STONE};${now ? 'font-weight:bold;' : ''}">${esc(label)}</div></td>`;
    })
    .join('');
  const filled = p.steps.length > 1 ? Math.round((p.current / (p.steps.length - 1)) * 100) : 100;
  return `<tr><td style="padding:8px 40px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:8px ${cell / 2}% 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${filled > 0 ? `<td width="${filled}%" style="height:2px;background:${BRASS};font-size:0;line-height:0">&nbsp;</td>` : ''}
${filled < 100 ? `<td style="height:2px;background:${LINE};font-size:0;line-height:0">&nbsp;</td>` : ''}</tr></table>
</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:-10px"><tr>${dots}</tr></table>
</td></tr>`;
}

/**
 * The Zelqune email: an espresso band with the brass wordmark, a serif heading, the order code,
 * the order journey, a sand summary card, one espresso button and a quiet footer. Tables and
 * inline styles only, so Gmail, Outlook and phone mail apps show it the same.
 */
export function renderEmail(c: EmailContent): EmailMessage {
  const sans = SANS(c.lang);
  const bn = c.lang === 'bn';
  const rows = c.rows ?? [];
  const tracking = (px: string) =>
    bn ? 'letter-spacing:0;' : `letter-spacing:${px};text-transform:uppercase;`;
  const p = (text: string) =>
    `<p style="margin:0 0 14px;font-family:${sans};font-size:16px;line-height:1.65;color:${ESPRESSO}">${esc(text)}</p>`;

  const eyebrow = c.eyebrow
    ? `<p style="margin:0 0 12px;font-family:${sans};font-size:12px;${tracking('2.5px')}color:${WALNUT}">${esc(c.eyebrow)}</p>`
    : '';
  const heading = c.heading
    ? `<h1 style="margin:0 0 18px;font-family:${bn ? sans : SERIF};font-weight:normal;font-size:30px;line-height:1.25;color:${ESPRESSO}">${esc(c.heading)}</h1>`
    : '';
  const code = c.code
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px"><tr>
<td style="border:1px solid ${ESPRESSO};padding:10px 16px;font-family:${sans};font-size:11px;${tracking('2px')}color:${STONE}">${esc(c.code.label)}&nbsp;&nbsp;<span style="font-family:'Courier New',monospace;font-size:16px;letter-spacing:3px;color:${ESPRESSO};font-weight:bold;white-space:nowrap">${esc(c.code.value)}</span></td></tr></table>`
    : '';

  const summary =
    rows.length || c.total
      ? `<tr><td style="padding:4px 40px 8px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SAND}"><tr><td style="padding:22px 24px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${sans};font-size:14px;line-height:1.5;color:${ESPRESSO}">${rows
          .map(([k, v]) =>
            k
              ? `<tr><td style="padding:7px 12px 7px 0">${esc(k)}</td><td align="right" style="padding:7px 0;white-space:nowrap">${esc(v)}</td></tr>`
              : `<tr><td colspan="2" style="padding:6px 0"><div style="border-top:1px solid ${LINE};font-size:0;line-height:0">&nbsp;</div></td></tr>`,
          )
          .join('')}${
          c.total
            ? `<tr><td style="padding:14px 0 0;border-top:1px solid ${ESPRESSO};font-family:${bn ? sans : SERIF};font-size:20px">${esc(c.total[0])}</td><td align="right" style="padding:14px 0 0;border-top:1px solid ${ESPRESSO};font-family:${bn ? sans : SERIF};font-size:20px;white-space:nowrap">${esc(c.total[1])}</td></tr>`
            : ''
        }</table></td></tr></table></td></tr>`
      : '';

  const note = c.note
    ? `<tr><td style="padding:18px 40px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="border-left:3px solid ${BRASS};padding:4px 0 4px 16px;font-family:${sans};font-size:15px;line-height:1.6;color:${ESPRESSO}">${esc(c.note)}</td></tr></table></td></tr>`
    : '';

  const button = c.button
    ? `<tr><td style="padding:28px 40px 8px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="background:${ESPRESSO}"><a href="${esc(c.button.url)}" style="display:inline-block;padding:16px 30px;font-family:${sans};font-size:13px;${tracking('2px')}color:${CREAM};text-decoration:none">${esc(c.button.label)}&nbsp;&nbsp;&rarr;</a></td></tr></table></td></tr>`
    : '';

  const siteLink = c.site
    ? `<a href="${esc(c.site.replace(/\/$/, ''))}/${c.lang}" style="color:${STONE};text-decoration:underline">zelqune.com</a> &nbsp;·&nbsp; `
    : '';
  const made = bn ? 'ঢাকায় হাতে তৈরি' : 'Handcrafted in Dhaka, Bangladesh';
  const preview = c.lines[1] ?? c.lines[0] ?? '';

  const html = `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:${CREAM}">
<div style="display:none;max-height:0;overflow:hidden">${esc(preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${PAPER}">
<tr><td align="center" style="background:${ESPRESSO};padding:30px 40px 26px">
<div style="font-family:${SERIF};font-size:24px;letter-spacing:9px;color:${BRASS}">ZELQUNE</div>
<div style="margin-top:8px;font-family:${sans};font-size:11px;${tracking('3px')}color:#CDBBA3">${bn ? 'কাঠ আর আলোর উষ্ণতা' : 'The warmth of wood and light'}</div>
</td></tr>
<tr><td style="padding:40px 40px 12px">${eyebrow}${heading}${c.lines.map(p).join('')}${code}</td></tr>
${c.progress ? progressHtml(c.progress, sans) : ''}${summary}${note}${button}
<tr><td style="padding:32px 40px 34px"><div style="border-top:1px solid ${LINE};padding-top:22px;font-family:${sans};font-size:14px;line-height:1.6;color:${STONE}">${esc(c.foot)}<br><a href="mailto:support@zelqune.com" style="color:${ESPRESSO};text-decoration:underline">support@zelqune.com</a></div></td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px"><tr><td align="center" style="padding:22px 12px 8px;font-family:${sans};font-size:12px;line-height:1.7;color:${STONE}">${siteLink}${made}<br>© 2026 Zelqune</td></tr></table>
</td></tr></table></body></html>`;

  const text = [
    ...(c.heading ? [c.heading, ''] : []),
    ...c.lines,
    ...(c.code ? ['', `${c.code.label}: ${c.code.value}`] : []),
    ...(rows.length ? ['', ...rows.filter(([k]) => k).map(([k, v]) => `${k}: ${v}`)] : []),
    ...(c.total ? [`${c.total[0]}: ${c.total[1]}`] : []),
    ...(c.note ? ['', c.note] : []),
    ...(c.button ? ['', `${c.button.label}: ${c.button.url}`] : []),
    '',
    c.foot,
    'support@zelqune.com',
    '',
    'Zelqune',
  ].join('\n');
  return { to: c.to, subject: c.subject, html, text };
}
