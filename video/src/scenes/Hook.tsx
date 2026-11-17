import { AbsoluteFill } from 'remotion';
import { ArchBloom, ArchLine, ArchWindow, archBox } from '../components/Arch';
import { KineticText } from '../components/Type';
import { useLayout } from '../lib/layout';
import { mix, useSpringAt } from '../lib/motion';
import { colors, copy, springs, timing } from '../video.config';

export const OPENING_PHOTO = 'images/moon-bonsai-panel.webp';

/**
 * 0–3 s: darkness; a point of brass light draws the Zelqune arch in mid-air, and inside it a real
 * Zelqune panel switches on. "Light that feels like home."
 */
export function Hook() {
  const L = useLayout();
  const box = archBox(L);
  const draw = useSpringAt(0, springs.camera);
  const light = useSpringAt(timing.hook.light, springs.soft);
  const push = useSpringAt(timing.hook.light, springs.camera);
  const wide = L.format === 'wide';
  return (
    <AbsoluteFill style={{ background: colors.night }}>
      <ArchBloom box={box} light={light} />
      <ArchWindow box={box} src={OPENING_PHOTO} light={light} zoom={mix(1.18, 1.06, push)} />
      <ArchLine box={box} draw={draw} glow={mix(1, 0.75, light)} />
      <div
        style={{
          position: 'absolute', left: box.text.x, top: box.text.y, width: box.text.w, height: box.text.h,
          display: 'flex', alignItems: wide ? 'center' : 'flex-start', justifyContent: wide ? 'flex-start' : 'center',
        }}
      >
        <KineticText lines={copy.hook} accentLine={1} delay={timing.hook.words} stagger={4} size={L.headline * (wide ? 1.05 : 0.92)} color={colors.paper} align={box.text.align} lineHeight={1.02} />
      </div>
    </AbsoluteFill>
  );
}
