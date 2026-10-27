'use client';

import { useSyncExternalStore } from 'react';

/**
 * One building, drawn as it is made. Every part reveals itself from the stage's scroll progress
 * `--p` (0 → 1, set on an ancestor), so the whole film is plain CSS: lines draw (pathLength 1),
 * columns rise, panes fill and windows light up. `--z` (0 → 1) flies the camera into one lit
 * window. Timings are fractions of the whole journey (7 chapters, ≈ 0.143 each).
 */

/** 0 → 1 as `--p` goes from `a` to `b`. */
const r = (a: number, b: number) => `clamp(0, (var(--p) - ${a}) / ${b - a}, 1)`;
/** Visible from `a`→`b`, gone again `c`→`d`. */
const span = (a: number, b: number, c: number, d: number) => `calc(${r(a, b)} - ${r(c, d)})`;

const BRASS = '#e9b872';

/** Landscape screens see the whole dusk; tall phones get the house framed and anchored low. */
const WIDE = '(min-aspect-ratio: 1/1)';
function subscribeWide(onChange: () => void) {
  const media = window.matchMedia(WIDE);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const draw = (a: number, b: number, extra?: React.CSSProperties): React.CSSProperties => ({
  strokeDasharray: 1,
  strokeDashoffset: `calc(1 - ${r(a, b)})`,
  ...extra,
});

const COLUMNS = [530, 760, 960, 1160];
const GROUND_PANES: [number, number][] = [
  [546, 760],
  [776, 960],
  [976, 1160],
];
const UPPER_PANES: [number, number][] = [
  [760, 880],
  [880, 1000],
  [1000, 1120],
  [1120, 1250],
];

export function BuildingScene({ approved }: { approved: string }) {
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  return (
    <svg
      viewBox={wide ? '0 0 1600 900' : '380 250 960 620'}
      preserveAspectRatio={wide ? 'xMidYMid slice' : 'xMidYMax meet'}
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#120d0b" />
          <stop offset=".55" stopColor="#2a1c16" />
          <stop offset=".84" stopColor="#5a3524" />
          <stop offset="1" stopColor="#7a4a2c" />
        </linearGradient>
        <pattern id="bs-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke={BRASS} strokeOpacity=".14" strokeWidth="1" />
        </pattern>
        <radialGradient id="bs-glow">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity=".95" />
          <stop offset=".6" stopColor="#f2b268" stopOpacity=".75" />
          <stop offset="1" stopColor="#c9783a" stopOpacity=".55" />
        </radialGradient>
        <filter id="bs-bloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* Dusk sky and the land. */}
      {/* The night above (tall phones see beyond the frame), then the dusk. */}
      <rect x="-2000" y="-3000" width="5600" height="3000" fill="#120d0b" />
      <rect width="1600" height="900" fill="url(#bs-sky)" />
      <ellipse
        cx="860"
        cy="760"
        rx="900"
        ry="190"
        fill="#c9783a"
        opacity=".22"
        filter="url(#bs-bloom)"
      />
      <path
        d="M0 735 C180 700 320 715 460 728 S760 700 900 718 S1260 690 1600 722 V760 H0Z"
        fill="#1d1410"
      />
      {[90, 150, 205, 1390, 1450, 1520].map((x, i) => (
        <g key={x} fill="#170f0c">
          <rect x={x - 2} y={712 - (i % 3) * 8} width="4" height="40" />
          <ellipse cx={x} cy={706 - (i % 3) * 8} rx={18 + (i % 2) * 6} ry={26 + (i % 3) * 5} />
        </g>
      ))}
      <rect y="760" width="1600" height="140" fill="#0f0a08" />
      <line x1="0" y1="760" x2="1600" y2="760" stroke={BRASS} strokeOpacity=".35" />

      {/* The camera: everything below can fly into one window. */}
      <g
        style={{
          transformBox: 'view-box',
          transformOrigin: '940px 468px',
          transform: 'scale(calc(1 + 9 * var(--z) * var(--z)))',
        }}
      >
        {/* Plan: the drawing grid. */}
        <rect
          x="-2000"
          y="-3000"
          width="5600"
          height="3900"
          fill="url(#bs-grid)"
          style={{ opacity: span(0.15, 0.2, 0.4, 0.46) }}
        />

        {/* Survey pegs at the corners of the plot. */}
        {[470, 1250].map((x) => (
          <g key={x} style={{ opacity: span(0.04, 0.09, 0.44, 0.48) }}>
            <line x1={x} y1="760" x2={x} y2="712" stroke={BRASS} strokeWidth="2" />
            <path d={`M${x} 712 l22 8 l-22 8z`} fill={BRASS} />
          </g>
        ))}

        {/* Plan: the outline of the house draws itself. */}
        <g
          fill="none"
          stroke={BRASS}
          strokeWidth="2"
          style={{ opacity: span(0.16, 0.18, 0.6, 0.66) }}
        >
          <path pathLength={1} d="M520 760V560H1180V760" style={draw(0.17, 0.23)} />
          <path pathLength={1} d="M470 560V380H1250V560Z" style={draw(0.2, 0.26)} />
          <path pathLength={1} d="M450 372H1270" style={draw(0.23, 0.27)} />
          {COLUMNS.map((x, i) => (
            <path
              key={x}
              pathLength={1}
              d={`M${x + 8} 760V380`}
              strokeDasharray="1"
              strokeOpacity=".5"
              style={draw(0.22 + i * 0.01, 0.27 + i * 0.01)}
            />
          ))}
        </g>

        {/* Approvals: dimensions and the seal. */}
        <g
          stroke={BRASS}
          strokeWidth="1.5"
          fill="none"
          style={{ opacity: span(0.24, 0.28, 0.5, 0.56) }}
        >
          <path pathLength={1} d="M470 810H1250M470 800v20M1250 800v20" style={draw(0.25, 0.3)} />
          <path pathLength={1} d="M1310 380V760M1300 380h20M1300 760h20" style={draw(0.26, 0.31)} />
          <text
            x="860"
            y="842"
            fill={BRASS}
            stroke="none"
            fontSize="22"
            textAnchor="middle"
            fontFamily="serif"
            letterSpacing="3"
          >
            18.4 m
          </text>
          <text
            x="1340"
            y="576"
            fill={BRASS}
            stroke="none"
            fontSize="22"
            fontFamily="serif"
            letterSpacing="3"
          >
            7.6 m
          </text>
        </g>
        <g style={{ opacity: span(0.3, 0.33, 0.46, 0.5) }}>
          <circle
            cx="1390"
            cy="210"
            r="74"
            fill="none"
            stroke={BRASS}
            strokeWidth="2.5"
            pathLength={1}
            style={draw(0.3, 0.37, {
              transform: 'rotate(-90deg)',
              transformBox: 'fill-box',
              transformOrigin: 'center',
            })}
          />
          <circle
            cx="1390"
            cy="210"
            r="60"
            fill="none"
            stroke={BRASS}
            strokeWidth="1"
            strokeOpacity=".6"
          />
          <text
            x="1390"
            y="217"
            fill={BRASS}
            fontSize="20"
            textAnchor="middle"
            fontFamily="serif"
            // Latin is spaced like a stamp; Bangla is never letter-spaced (it breaks the letters).
            letterSpacing={/[a-z]/i.test(approved) ? 4 : 0}
            style={{ opacity: r(0.35, 0.38) }}
          >
            {approved}
          </text>
        </g>

        {/* Structure: slab, columns, floors. */}
        <rect
          x="500"
          y="760"
          width="700"
          height="18"
          fill="#6b5446"
          style={{ opacity: r(0.43, 0.46) }}
        />
        {COLUMNS.map((x, i) => (
          <rect
            key={x}
            x={x}
            y="380"
            width="16"
            height="380"
            fill="#8d7766"
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'bottom',
              transform: `scaleY(${r(0.45 + i * 0.012, 0.51 + i * 0.012)})`,
            }}
          />
        ))}
        <rect
          x="470"
          y="552"
          width="780"
          height="14"
          fill="#9c8572"
          style={{ opacity: r(0.51, 0.53) }}
        />
        <rect
          x="450"
          y="366"
          width="820"
          height="16"
          fill="#a88f7b"
          style={{ opacity: r(0.54, 0.56) }}
        />

        {/* Finishing: glass, the wood-slat facade, the door. */}
        <g style={{ opacity: r(0.58, 0.63) }}>
          {GROUND_PANES.map(([a, b]) => (
            <rect key={a} x={a} y="566" width={b - a} height="194" fill="#20252b" />
          ))}
          {UPPER_PANES.map(([a, b]) => (
            <rect key={a} x={a} y="382" width={b - a} height="170" fill="#20252b" />
          ))}
          <rect x="470" y="382" width="290" height="170" fill="#5a3c28" />
          {Array.from({ length: 28 }, (_, i) => (
            <line
              key={i}
              x1={478 + i * 10}
              y1="386"
              x2={478 + i * 10}
              y2="548"
              stroke="#3b2618"
              strokeWidth="3"
            />
          ))}
          <rect x="520" y="566" width="10" height="194" fill="#8d7766" />
          {/* A stone feature wall rising past the roof. */}
          <rect x="1180" y="330" width="56" height="430" fill="#6f5e52" />
          {Array.from({ length: 14 }, (_, i) => (
            <line
              key={`st${i}`}
              x1="1180"
              y1={350 + i * 30}
              x2="1236"
              y2={350 + i * 30}
              stroke="#5a4a40"
              strokeWidth="2"
            />
          ))}
          {/* Roof terrace: a glass rail and a planter. */}
          <rect x="760" y="336" width="420" height="30" fill="#c9d4d8" opacity=".18" />
          <line x1="760" y1="336" x2="1180" y2="336" stroke="#d9c3a5" strokeWidth="2" />
          <rect x="480" y="350" width="120" height="16" fill="#3c4a2c" />
          {/* Entrance and steps. */}
          <rect x="560" y="610" width="70" height="150" fill="#3b2618" />
          <rect x="540" y="760" width="110" height="8" fill="#a88f7b" />
          <rect x="530" y="768" width="130" height="8" fill="#94806e" />
        </g>
        {/* Warm downlights under the overhang and a garden that grows in with the finish. */}
        <g style={{ opacity: r(0.62, 0.68) }}>
          {[520, 640, 760, 880, 1000, 1120].map((x) => (
            <g key={`dl${x}`}>
              <circle cx={x} cy="572" r="3" fill="#ffd9a0" />
              <path
                d={`M${x - 3} 574 L${x - 40} 760 H${x + 40} L${x + 3} 574Z`}
                fill="#f2b268"
                opacity=".08"
              />
            </g>
          ))}
        </g>
        <g fill="#1f1712" style={{ opacity: r(0.6, 0.66) }}>
          {[
            { x: 400, h: 150 },
            { x: 1300, h: 190 },
            { x: 1355, h: 120 },
          ].map((t) => (
            <g key={t.x}>
              <rect x={t.x - 3} y={760 - t.h * 0.45} width="6" height={t.h * 0.45} />
              <ellipse cx={t.x} cy={760 - t.h * 0.62} rx={t.h * 0.22} ry={t.h * 0.34} />
            </g>
          ))}
          <rect x="440" y="752" width="820" height="10" rx="5" fill="#26301c" />
        </g>

        {/* Interiors: the windows light up, one after another. */}
        {[
          ...GROUND_PANES.map(([a, b]) => ({ a, b, y: 566, h: 194 })),
          ...UPPER_PANES.map(([a, b]) => ({ a, b, y: 382, h: 170 })),
        ].map((w, i) => (
          <g key={`${w.a}-${w.y}`} style={{ opacity: r(0.63 + i * 0.008, 0.68 + i * 0.008) }}>
            <rect x={w.a} y={w.y} width={w.b - w.a} height={w.h} fill="url(#bs-glow)" />
            <rect
              x={w.a - 10}
              y={w.y - 10}
              width={w.b - w.a + 20}
              height={w.h + 20}
              fill="#f2b268"
              opacity=".35"
              filter="url(#bs-bloom)"
            />
          </g>
        ))}
        {/* Mullions over the glass. */}
        <g stroke="#1a1310" strokeWidth="4" style={{ opacity: r(0.58, 0.63) }}>
          {GROUND_PANES.map(([a]) => (
            <line key={`g${a}`} x1={a} y1="566" x2={a} y2="760" />
          ))}
          {UPPER_PANES.map(([a]) => (
            <line key={`u${a}`} x1={a} y1="382" x2={a} y2="552" />
          ))}
        </g>
      </g>
    </svg>
  );
}
