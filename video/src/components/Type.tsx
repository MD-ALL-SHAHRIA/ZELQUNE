import type { CSSProperties } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { display, ui } from '../lib/fonts';
import { springAt } from '../lib/motion';
import { colors, springs } from '../video.config';

type KineticProps = {
  lines: readonly string[];
  delay?: number;
  size: number;
  color?: string;
  font?: 'display' | 'ui';
  align?: CSSProperties['textAlign'];
  /** Frames between words. */
  stagger?: number;
  /** Line index set in brass italic. */
  accentLine?: number;
  lineHeight?: number;
  style?: CSSProperties;
};

/** Word-by-word mask reveal: each word rises out of its own clipped line box. */
export function KineticText({
  lines, delay = 0, size, color = colors.espresso, font = 'display', align = 'left', stagger = 3,
  accentLine, lineHeight = 1.04, style,
}: KineticProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let i = 0;
  return (
    <div style={{ fontFamily: font === 'display' ? display : ui, fontSize: size, color, textAlign: align, lineHeight, ...style }}>
      {lines.map((line, li) => (
        <div key={li} style={{ display: 'block' }}>
          {line.split(' ').map((word, wi) => {
            const p = springAt(frame, fps, delay + i++ * stagger, springs.snappy);
            const accent = li === accentLine;
            return (
              <span key={wi} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: size * 0.08 }}>
                <span
                  style={{
                    display: 'inline-block',
                    transform: `translateY(${(1 - p) * 115}%) rotate(${(1 - p) * 4}deg)`,
                    fontStyle: accent ? 'italic' : 'normal',
                    color: accent ? colors.glow : undefined,
                  }}
                >
                  {word}
                  {wi < line.split(' ').length - 1 ? ' ' : ''}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Small spaced label, like the storefront's eyebrows. */
export function Eyebrow({ children, color = colors.walnut, size = 26, style }: { children: string; color?: string; size?: number; style?: CSSProperties }) {
  return (
    <div style={{ fontFamily: ui, fontSize: size, letterSpacing: '0.22em', textTransform: 'uppercase', color, fontWeight: 500, ...style }}>
      {children}
    </div>
  );
}
