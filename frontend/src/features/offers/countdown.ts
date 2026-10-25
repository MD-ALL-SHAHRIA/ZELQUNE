/** Time left until `endsAt`, split for display; null once it has passed. */
export function timeLeft(
  endsAt: string,
  now: number,
): { d: number; hh: string; mm: string; ss: string } | null {
  let s = Math.floor((new Date(endsAt).getTime() - now) / 1000);
  if (!(s > 0)) return null;
  const d = Math.floor(s / 86_400);
  s -= d * 86_400;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    d,
    hh: pad(Math.floor(s / 3600)),
    mm: pad(Math.floor((s % 3600) / 60)),
    ss: pad(s % 60),
  };
}

/** Percent off between the regular and the sale price, rounded down (never overstated). */
export function percentOff(regularPaisa: number, salePaisa: number): number {
  if (regularPaisa <= 0 || salePaisa >= regularPaisa) return 0;
  return Math.floor(((regularPaisa - salePaisa) / regularPaisa) * 100);
}
