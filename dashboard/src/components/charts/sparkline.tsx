/**
 * Smooth trend line inside a KPI card (decorative; the card states the number). Fills its box,
 * a quiet grey stroke over a faint grid, a monotone curve so it never overshoots.
 */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const W = 300;
  const H = 64;
  if (values.length < 2) return <div aria-hidden className={className} />;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - 8 - ((v - min) / span) * (H - 16),
  }));
  // Monotone cubic (Fritsch–Carlson) tangents.
  const n = pts.length;
  const d = pts.slice(1).map((p, i) => (p.y - pts[i]!.y) / (p.x - pts[i]!.x));
  const m = pts.map((_, i) =>
    i === 0
      ? d[0]!
      : i === n - 1
        ? d[n - 2]!
        : d[i - 1]! * d[i]! <= 0
          ? 0
          : (d[i - 1]! + d[i]!) / 2,
  );
  let path = `M${pts[0]!.x},${pts[0]!.y}`;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const h = (b.x - a.x) / 3;
    path += ` C${a.x + h},${a.y + m[i]! * h} ${b.x - h},${b.y - m[i + 1]! * h} ${b.x},${b.y}`;
  }
  return (
    <div aria-hidden className={className}>
      <div className="relative h-16">
        <div className="bg-faint-grid absolute inset-0" />
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="relative h-full w-full overflow-visible"
        >
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            className="text-stone/70"
          />
        </svg>
      </div>
    </div>
  );
}
