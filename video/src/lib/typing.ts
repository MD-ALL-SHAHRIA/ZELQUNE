import { copy, timing } from '../video.config';

/** When each typed field starts and how long it is (frames, from the start of the Deliver scene). */
export function typingSchedule() {
  const T = timing.deliver;
  const code = { text: copy.deliver.code, start: T.typeStart };
  const phone = { text: copy.deliver.phone, start: code.start + code.text.length * T.perChar + T.gap };
  return { perChar: T.perChar, fields: [code, phone] as const };
}

/** Characters of a field visible at `frame` (one per `perChar` frames). */
export function typedCount(frame: number, start: number, length: number, perChar: number) {
  if (frame < start) return 0;
  return Math.min(length, Math.floor((frame - start) / perChar) + 1);
}
