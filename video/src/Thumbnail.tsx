import { AbsoluteFill } from 'remotion';
import { Backdrop, Grain } from './components/Backdrop';
import { ProductCard, Logo } from './components/Ui';
import { KineticText } from './components/Type';
import './lib/fonts';
import { colors, screens } from './video.config';

/** 1080×1080 cover frame: real product cards, the promise, the logo. */
export function Thumbnail() {
  const rot = [-8, 0, 8];
  return (
    <AbsoluteFill>
      <Backdrop tone="warm" drift={0} />
      <AbsoluteFill style={{ background: 'radial-gradient(50% 45% at 50% 62%, rgba(233,184,114,0.5), transparent 70%)' }} />
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 90, gap: 26 }}>
        <Logo size={70} delay={-100} />
        <KineticText lines={['Warmth for', 'every wall.']} accentLine={1} size={104} align="center" delay={-100} color={colors.espresso} />
      </AbsoluteFill>
      {screens.cards.map((src, i) => (
        <ProductCard key={src} src={src} width={300} style={{ position: 'absolute', left: 90 + i * 300, top: i === 1 ? 520 : 560, transform: `rotate(${rot[i]}deg)` }} />
      ))}
      <Grain />
    </AbsoluteFill>
  );
}
