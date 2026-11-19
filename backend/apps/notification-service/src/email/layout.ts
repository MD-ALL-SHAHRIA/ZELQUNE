import { LOGO_CID, logoAttachment } from './brand-logo';
import { type EmailMessage } from './email.provider';

export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export interface EmailItem {
  name: string;
  /** Second line, e.g. "Qty 1". */
  meta: string;
  price: string;
  /** Absolute photo URL (storefront /email/products/<slug>.jpg). */
  image?: string;
}

export interface EmailContent {
  to: string;
  lang: 'en' | 'bn';
  subject: string;
  /** Arch-framed photo above the heading (the ordered piece, or a signature piece). */
  hero?: { url: string; alt: string };
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
  /** The pieces, each with a photo. */
  items?: { title: string; list: EmailItem[] };
  /** Label / value rows under the items (delivery, advance, ...). */
  rows?: [string, string][];
  /** The large total line. */
  total?: [string, string];
  /** A framed note (what to pay, what happens next). */
  note?: string;
  button?: { label: string; url: string };
  /** The help line ("Questions? Reply..."). */
  foot: string;
  /** Storefront base URL: footer links and the promise row. Omitted for internal emails. */
  site?: string;
}

// Brand colours (packages/ui-tokens), fixed here because email clients ignore CSS variables.
const ESPRESSO = '#3B2922';
const NIGHT = '#2A1D17';
const CREAM = '#F3EBDF';
const PAPER = '#FFFCF7';
const LINE = '#E6DCCD';
const STONE = '#7A6A5F';
const BRASS = '#D9B47A';
const WALNUT = '#7A5C30';
const IVORY = '#F7F1E8';

/** The site's display face where the mail app loads web fonts (Apple Mail, iOS), else Georgia. */
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const SANS = (lang: 'en' | 'bn') =>
  lang === 'bn'
    ? "'Hind Siliguri','Noto Sans Bengali','Segoe UI',Arial,sans-serif"
    : "'Helvetica Neue',Helvetica,Arial,sans-serif";

const T = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"';

/**
 * The Zelqune email, built like a printed card from the workshop: the brass logo on espresso,
 * the piece in an arch (the brand's one curve), a centred serif heading, the order stamp and
 * journey, the pieces with their photos, a quiet total, one button, the three promises, a
 * signature, and an espresso footer. Tables and inline styles only, so Gmail, Outlook and phone
 * mail apps show it alike; images are absolute URLs except the logo, which travels inline.
 */
export function renderEmail(c: EmailContent): EmailMessage {
  const bn = c.lang === 'bn';
  const sans = SANS(c.lang);
  const display = bn ? sans : SERIF;
  const caps = (px: string) =>
    bn ? 'letter-spacing:0;' : `letter-spacing:${px};text-transform:uppercase;`;
  const rule = (w = 36) =>
    `<td style="width:${w}px;border-top:1px solid ${BRASS};font-size:0;line-height:0">&nbsp;</td>`;
  const ornament = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 22px"><tr>${rule()}<td style="padding:0 10px;font-size:9px;line-height:9px;color:${BRASS}">&#9670;</td>${rule()}</tr></table>`;
  const sectionTitle = (text: string) =>
    `${T}><tr>${rule(0)}<td width="1%" style="padding:0 14px;white-space:nowrap;font-family:${sans};font-size:11px;${caps('3px')}color:${WALNUT}">${esc(text)}</td>${rule(0)}</tr></table>`;

  const hero = c.hero
    ? `<tr><td align="center" style="padding:48px 40px 0">
<img src="${esc(c.hero.url)}" width="220" height="275" alt="${esc(c.hero.alt)}" style="display:block;margin:0 auto;border:0;width:220px;height:275px;object-fit:cover;border-radius:110px 110px 0 0;background:${CREAM}">
</td></tr>`
    : '';

  const intro = `<tr><td align="center" style="padding:${c.hero ? 40 : 52}px 48px 8px">${ornament}${
    c.eyebrow
      ? `<p style="margin:0 0 14px;font-family:${sans};font-size:11px;${caps('3.5px')}color:${WALNUT}">${esc(c.eyebrow)}</p>`
      : ''
  }${
    c.heading
      ? `<h1 style="margin:0 0 20px;font-family:${display};font-weight:normal;font-size:${bn ? 30 : 42}px;line-height:1.15;color:${ESPRESSO}">${esc(c.heading)}</h1>`
      : ''
  }${c.lines
    .map(
      (l) =>
        `<p style="margin:0 auto 14px;max-width:440px;font-family:${sans};font-size:16px;line-height:1.7;color:#5A4A40">${esc(l)}</p>`,
    )
    .join('')}${
    c.code
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto 4px"><tr>
<td style="border:1px solid ${BRASS};padding:12px 22px;font-family:${sans};font-size:10px;${caps('3px')}color:${STONE}">${esc(c.code.label)}&nbsp;&nbsp;&nbsp;<span style="font-family:'Courier New',Courier,monospace;font-size:17px;letter-spacing:4px;color:${ESPRESSO};font-weight:bold;white-space:nowrap">${esc(c.code.value)}</span></td></tr></table>`
      : ''
  }</td></tr>`;

  const progress = c.progress ? journey(c.progress, sans) : '';

  const items = c.items
    ? `<tr><td style="padding:36px 40px 4px">${sectionTitle(c.items.title)}</td></tr>
<tr><td style="padding:8px 40px 0">${T}>${c.items.list
        .map(
          (i) => `<tr>
<td width="76" valign="middle" style="padding:16px 0;border-bottom:1px solid ${LINE}">${
            i.image
              ? `<img src="${esc(i.image)}" width="60" height="75" alt="" style="display:block;border:0;width:60px;height:75px;object-fit:cover;border-radius:30px 30px 0 0;background:${CREAM}">`
              : `<div style="width:60px;height:75px;border-radius:30px 30px 0 0;background:${CREAM}"></div>`
          }</td>
<td valign="middle" style="padding:16px 12px;border-bottom:1px solid ${LINE}"><div style="font-family:${display};font-size:${bn ? 16 : 21}px;line-height:1.25;color:${ESPRESSO}">${esc(i.name)}</div><div style="margin-top:4px;font-family:${sans};font-size:12px;${caps('1.5px')}color:${STONE}">${esc(i.meta)}</div></td>
<td align="right" valign="middle" style="padding:16px 0;border-bottom:1px solid ${LINE};white-space:nowrap;font-family:${sans};font-size:15px;color:${ESPRESSO}">${esc(i.price)}</td></tr>`,
        )
        .join('')}</table></td></tr>`
    : '';

  const rows = c.rows ?? [];
  const totals =
    rows.length || c.total
      ? `<tr><td style="padding:14px 40px 0">${T} style="font-family:${sans};font-size:14px;color:#5A4A40">${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:7px 0">${esc(k)}</td><td align="right" style="padding:7px 0;white-space:nowrap;color:${ESPRESSO}">${esc(v)}</td></tr>`,
          )
          .join('')}${
          c.total
            ? `<tr><td style="padding:18px 0 0;border-top:1px solid ${ESPRESSO};font-family:${sans};font-size:11px;${caps('3px')}color:${ESPRESSO}">${esc(c.total[0])}</td><td align="right" style="padding:14px 0 0;border-top:1px solid ${ESPRESSO};font-family:${display};font-size:${bn ? 22 : 30}px;white-space:nowrap;color:${ESPRESSO}">${esc(c.total[1])}</td></tr>`
            : ''
        }</table></td></tr>`
      : '';

  const note = c.note
    ? `<tr><td style="padding:30px 40px 0">${T}><tr><td align="center" style="background:${CREAM};border-top:2px solid ${BRASS};padding:22px 28px;font-family:${sans};font-size:15px;line-height:1.65;color:${ESPRESSO}">${esc(c.note)}</td></tr></table></td></tr>`
    : '';

  const button = c.button
    ? `<tr><td align="center" style="padding:36px 40px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
<td style="background:${ESPRESSO}"><a href="${esc(c.button.url)}" style="display:inline-block;padding:18px 40px;font-family:${sans};font-size:12px;${caps('3px')}color:${IVORY};text-decoration:none">${esc(c.button.label)}</a></td></tr></table></td></tr>`
    : '';

  const promises = c.site
    ? `<tr><td style="padding:48px 40px 0">${T}><tr>${(bn
        ? ['ঢাকায় হাতে তৈরি', 'নিরেট কাঠ, উষ্ণ আলো', 'আপনার জন্য বানানো']
        : ['Handcrafted in Dhaka', 'Solid wood, warm light', 'Made for you']
      )
        .map(
          (t, i) =>
            `<td width="33%" align="center" valign="top" style="padding:0 6px;${i ? `border-left:1px solid ${LINE};` : ''}"><div style="font-size:9px;line-height:9px;color:${BRASS}">&#9670;</div><div style="margin-top:10px;font-family:${sans};font-size:11px;line-height:1.5;${caps('1.5px')}color:${STONE}">${esc(t)}</div></td>`,
        )
        .join('')}</tr></table></td></tr>`
    : '';

  const signature = c.site
    ? `<tr><td align="center" style="padding:44px 40px 0;font-family:${display};font-style:${bn ? 'normal' : 'italic'};font-size:${bn ? 16 : 22}px;line-height:1.45;color:${ESPRESSO}">${bn ? 'উষ্ণ শুভেচ্ছায়,<br>Zelqune ওয়ার্কশপ' : 'With warmth,<br>the Zelqune workshop'}</td></tr>`
    : '';

  const help = `<tr><td align="center" style="padding:40px 48px 48px"><div style="border-top:1px solid ${LINE};padding-top:26px;font-family:${sans};font-size:14px;line-height:1.7;color:${STONE}">${esc(c.foot)}<br><a href="mailto:support@zelqune.com" style="color:${ESPRESSO};text-decoration:underline">support@zelqune.com</a></div></td></tr>`;

  const base = c.site?.replace(/\/$/, '');
  const link = (href: string, text: string) =>
    `<a href="${esc(href)}" style="color:${IVORY};text-decoration:none;font-family:${sans};font-size:11px;${caps('2.5px')}">${esc(text)}</a>`;
  const nav = base
    ? `<tr><td align="center" style="padding:22px 24px 0">${[
        link(`${base}/${c.lang}/shop`, bn ? 'দোকান' : 'Shop'),
        link(`${base}/${c.lang}/track`, bn ? 'অর্ডার ট্র্যাক' : 'Track order'),
        link(`${base}/${c.lang}/faq`, bn ? 'সাহায্য' : 'Help'),
      ].join(`<span style="color:${BRASS};padding:0 14px">&middot;</span>`)}</td></tr>`
    : '';
  const footer = `${T} style="max-width:600px;background:${NIGHT}"><tr><td align="center" style="padding:40px 24px 0">
<img src="cid:${LOGO_CID}" width="96" height="63" alt="ZELQUNE" style="display:block;margin:0 auto;border:0;width:96px;height:auto;font-family:Georgia,serif;font-size:16px;letter-spacing:6px;color:${BRASS}"></td></tr>
${nav}<tr><td align="center" style="padding:22px 24px 36px;font-family:${sans};font-size:12px;line-height:1.8;color:#A99683">${bn ? 'ঢাকায় হাতে তৈরি, বাংলাদেশ' : 'Handcrafted in Dhaka, Bangladesh'}<br><a href="mailto:support@zelqune.com" style="color:#A99683;text-decoration:underline">support@zelqune.com</a><br><span style="color:#7E6C5D">© 2026 Zelqune · ${bn ? 'অর্ডার বা অ্যাকাউন্টের কারণে এই ইমেইল পাঠানো হয়েছে।' : 'You received this email because of an order or account at Zelqune.'}</span></td></tr></table>`;

  const html = `<!doctype html><html lang="${c.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(c.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>@media (max-width:520px){.px{padding-left:22px!important;padding-right:22px!important}}</style></head>
<body style="margin:0;padding:0;background:${CREAM};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.lines[0] ?? '')}</div>
${T} style="background:${CREAM}"><tr><td align="center" style="padding:32px 10px">
${T} style="max-width:600px;background:${ESPRESSO}"><tr><td align="center" style="padding:44px 40px 40px">
<img src="cid:${LOGO_CID}" width="150" height="98" alt="ZELQUNE" style="display:block;margin:0 auto;border:0;outline:none;width:150px;height:auto;font-family:Georgia,serif;font-size:24px;letter-spacing:9px;color:${BRASS}">
</td></tr></table>
${T} style="max-width:600px;background:${PAPER}">
${hero}${intro}${progress}${items}${totals}${note}${button}${promises}${signature}${help}
</table>
${footer}
</td></tr></table></body></html>`;

  const text = [
    ...(c.heading ? [c.heading, ''] : []),
    ...c.lines,
    ...(c.code ? ['', `${c.code.label}: ${c.code.value}`] : []),
    ...(c.items ? ['', ...c.items.list.map((i) => `${i.name} (${i.meta}): ${i.price}`)] : []),
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(c.total ? [`${c.total[0]}: ${c.total[1]}`] : []),
    ...(c.note ? ['', c.note] : []),
    ...(c.button ? ['', `${c.button.label}: ${c.button.url}`] : []),
    '',
    c.foot,
    'support@zelqune.com',
    '',
    'Zelqune',
  ].join('\n');
  return { to: c.to, subject: c.subject, html, text, attachments: [logoAttachment()] };
}

function journey(p: { steps: string[]; current: number }, sans: string): string {
  const n = p.steps.length;
  const cell = 100 / n;
  const filled = n > 1 ? Math.round((p.current / (n - 1)) * 100) : 100;
  const dots = p.steps
    .map((label, i) => {
      const done = i <= p.current;
      const now = i === p.current;
      const dot = now
        ? `width:16px;height:16px;border-radius:8px;background:${ESPRESSO};border:3px solid ${BRASS}`
        : done
          ? `width:12px;height:12px;border-radius:6px;background:${BRASS};border:2px solid ${BRASS}`
          : `width:12px;height:12px;border-radius:6px;background:${PAPER};border:2px solid ${LINE}`;
      return `<td width="${cell}%" align="center" valign="top"><div style="height:22px"><div style="${dot};margin:${now ? 0 : 3}px auto 0"></div></div>
<div style="margin-top:8px;font-family:${sans};font-size:11px;line-height:1.3;color:${done ? ESPRESSO : '#A99683'};${now ? 'font-weight:bold;' : ''}">${esc(label)}</div></td>`;
    })
    .join('');
  return `<tr><td style="padding:34px 40px 4px">
${T}><tr><td style="padding:10px ${cell / 2}% 0">${T}><tr>
${filled > 0 ? `<td width="${filled}%" style="height:2px;background:${BRASS};font-size:0;line-height:0">&nbsp;</td>` : ''}
${filled < 100 ? `<td style="height:2px;background:${LINE};font-size:0;line-height:0">&nbsp;</td>` : ''}</tr></table></td></tr></table>
${T} style="margin-top:-12px"><tr>${dots}</tr></table></td></tr>`;
}
