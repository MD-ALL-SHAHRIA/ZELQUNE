import { describe, expect, it } from 'vitest';
import { bn } from '@/i18n/dictionaries/bn';
import { en } from '@/i18n/dictionaries/en';
import { chatMessage, timelineSteps } from './product-copy';

describe('timelineSteps', () => {
  it('fills the lead time once the catalog has it', () => {
    const steps = timelineSteps(en.premium.timeline, 21, 'en');
    expect(steps[1]?.text).toBe('Made by hand in 21 days');
    expect(steps[0]).toEqual(en.premium.timeline[0]);
  });
  it('uses Bangla digits on Bangla pages', () => {
    expect(timelineSteps(bn.premium.timeline, 21, 'bn')[1]?.text).toBe('২১ দিনে হাতে বানানো');
  });
  it('uses the default making time while the lead time is unknown', () => {
    expect(timelineSteps(en.premium.timeline, null, 'en')[1]?.text).toBe('Made by hand in 10 days');
  });
});

describe('chatMessage', () => {
  it('names the product in the prefilled message', () => {
    expect(chatMessage(en, 'Wave Shelf')).toBe('Hello Zelqune, I have a question about Wave Shelf');
    expect(chatMessage(bn, 'ওয়েভ শেলফ')).toContain('ওয়েভ শেলফ');
  });
});
