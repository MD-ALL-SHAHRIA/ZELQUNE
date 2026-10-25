/** Tiny trend line inside a KPI tile (decorative; the tile states the number). */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const W = 120;
  const H = 32;
  if (values.length < 2) return <svg width={W} height={H} aria-hidden className={className} />;
  const max = Math.max(...values, 1);
  const pts = values.map(
    (v, i) =>
      `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 2 - (v / max) * (H - 4)).toFixed(1)}`,
  );
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className={className}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="var(--color-chart-revenue)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
