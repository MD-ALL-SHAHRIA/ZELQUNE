import { type AuthMail } from '@zelqune/contracts';
import { type EmailMessage } from './email.provider';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

type Copy = { subject: string; lines: string[]; button?: string; foot: string };

function copy(m: AuthMail): Copy {
  const bn = m.lang === 'bn';
  const hi = bn ? `প্রিয় ${m.name || 'গ্রাহক'},` : `Hi ${m.name || 'there'},`;
  switch (m.kind) {
    case 'verify':
      return bn
        ? {
            subject: 'আপনার Zelqune অ্যাকাউন্টের ইমেইল নিশ্চিত করুন',
            lines: [
              hi,
              'অ্যাকাউন্ট চালু করতে নিচের বোতামে চাপুন। লিংকটি ২৪ ঘণ্টা কাজ করবে, একবারই।',
            ],
            button: 'ইমেইল নিশ্চিত করুন',
            foot: 'আপনি অ্যাকাউন্ট না খুলে থাকলে এই ইমেইল উপেক্ষা করুন।',
          }
        : {
            subject: 'Confirm your email for Zelqune',
            lines: [
              hi,
              'Press the button to switch on your account. The link works once, for 24 hours.',
            ],
            button: 'Confirm my email',
            foot: "If you didn't create an account, you can ignore this email.",
          };
    case 'reset':
      return bn
        ? {
            subject: 'আপনার Zelqune পাসওয়ার্ড বদলান',
            lines: [
              hi,
              'নতুন পাসওয়ার্ড দিতে নিচের বোতামে চাপুন। লিংকটি ৩০ মিনিট কাজ করবে, একবারই। বদলানোর পর সব ডিভাইস থেকে সাইন আউট হবে।',
            ],
            button: 'নতুন পাসওয়ার্ড দিন',
            foot: 'আপনি অনুরোধ না করে থাকলে এই ইমেইল উপেক্ষা করুন; আপনার পাসওয়ার্ড বদলাবে না।',
          }
        : {
            subject: 'Reset your Zelqune password',
            lines: [
              hi,
              'Press the button to choose a new password. The link works once, for 30 minutes. Afterwards every device is signed out.',
            ],
            button: 'Choose a new password',
            foot: "If you didn't ask for this, ignore this email. Your password stays the same.",
          };
    case 'exists':
      return bn
        ? {
            subject: 'আপনার ইমেইলে Zelqune অ্যাকাউন্ট আগে থেকেই আছে',
            lines: [
              hi,
              'কেউ এই ইমেইল দিয়ে নতুন অ্যাকাউন্ট খোলার চেষ্টা করেছে, কিন্তু অ্যাকাউন্টটি আগে থেকেই আছে। সাইন ইন করুন, অথবা পাসওয়ার্ড ভুলে গেলে রিসেট করুন।',
            ],
            button: 'সাইন ইন করুন',
            foot: 'আপনি চেষ্টা না করে থাকলে কিছু করতে হবে না।',
          }
        : {
            subject: 'You already have a Zelqune account',
            lines: [
              hi,
              'Someone tried to create an account with this email, but one already exists. Sign in, or reset your password if you have forgotten it.',
            ],
            button: 'Sign in',
            foot: "If this wasn't you, you don't need to do anything.",
          };
    case 'phoneTaken':
      return bn
        ? {
            subject: 'Zelqune অ্যাকাউন্ট খোলা যায়নি',
            lines: [
              hi,
              'আপনার দেওয়া ফোন নম্বরটি অন্য একটি অ্যাকাউন্টে আছে, তাই নতুন অ্যাকাউন্ট খোলা হয়নি। সেই অ্যাকাউন্টে সাইন ইন করুন, অথবা অন্য নম্বর দিয়ে আবার চেষ্টা করুন।',
            ],
            button: 'সাইন ইন করুন',
            foot: 'সাহায্য লাগলে WhatsApp-এ মেসেজ করুন।',
          }
        : {
            subject: "We couldn't create your Zelqune account",
            lines: [
              hi,
              'The phone number you gave already belongs to another account, so no new account was created. Sign in to that account, or try again with a different number.',
            ],
            button: 'Sign in',
            foot: 'Need help? Message us on WhatsApp.',
          };
  }
}

/**
 * The link carries the token in the fragment (#token=...): browsers never send fragments to
 * servers or in Referer headers, so the token cannot land in a log.
 */
function link(m: AuthMail, site: string): string {
  const base = `${site.replace(/\/$/, '')}/${m.lang}/account`;
  if (m.kind === 'verify') return `${base}/verify#token=${m.token}`;
  if (m.kind === 'reset') return `${base}/reset-password#token=${m.token}`;
  return `${base}/login`;
}

export function authEmail(m: AuthMail, site: string): EmailMessage {
  const c = copy(m);
  const url = link(m, site);
  const text = [...c.lines, '', `${c.button}: ${url}`, '', c.foot, '', 'Zelqune'].join('\n');
  const html = `<!doctype html><html lang="${m.lang}"><body style="margin:0;background:#F7F1E8;font-family:Arial,Helvetica,sans-serif;color:#3B2922">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#FFFDF9;border:1px solid #E6DCCD" cellpadding="0" cellspacing="0">
<tr><td style="padding:28px 32px 8px;font-family:Georgia,serif;font-size:22px;letter-spacing:6px">ZELQUNE</td></tr>
<tr><td style="padding:8px 32px 0;font-size:16px;line-height:1.6">${c.lines.map((l) => `<p style="margin:0 0 14px">${esc(l)}</p>`).join('')}</td></tr>
<tr><td style="padding:8px 32px 24px"><a href="${esc(url)}" style="display:inline-block;background:#3B2922;color:#F7F1E8;text-decoration:none;padding:14px 26px;font-size:14px;letter-spacing:1px">${esc(c.button ?? '')}</a>
<p style="margin:16px 0 0;font-size:12px;color:#7A6A5F;word-break:break-all">${esc(url)}</p></td></tr>
<tr><td style="padding:16px 32px 28px;border-top:1px solid #E6DCCD;font-size:13px;color:#7A6A5F">${esc(c.foot)}</td></tr>
</table></td></tr></table></body></html>`;
  return { to: m.to, subject: c.subject, html, text };
}
