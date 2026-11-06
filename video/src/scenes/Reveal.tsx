import { AbsoluteFill } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { Laptop, Phone } from '../components/Devices';
import { Logo } from '../components/Ui';
import { useLayout } from '../lib/layout';
import { mix, useSpringAt } from '../lib/motion';
import { colors, screens, springs, timing } from '../video.config';

/** 8–12 s: warm light replaces the cold room; the logo draws, then the real home page glides in. */
export function Reveal() {
  const L = useLayout();
  const glow = useSpringAt(0, springs.soft);
  const lift = useSpringAt(34, springs.soft);
  const laptopIn = useSpringAt(timing.reveal.laptop, springs.soft);
  const phoneIn = useSpringAt(timing.reveal.phone, springs.soft);
  const drift = useSpringAt(50, springs.camera);

  const g = {
    wide: { logoY: [L.h / 2 - 60, 120], logo: [120, 76], laptopW: 1060, laptop: [330, 300], phoneH: 560, phone: [1300, 430] },
    feed: { logoY: [L.h / 2 - 60, 110], logo: [110, 70], laptopW: 860, laptop: [70, 330], phoneH: 560, phone: [700, 690] },
    story: { logoY: [L.h / 2 - 60, L.safe.top + 10], logo: [120, 80], laptopW: 900, laptop: [40, 640], phoneH: 760, phone: [600, 1020] },
  }[L.format];
  const logoSize = mix(g.logo[0], g.logo[1], lift);

  return (
    <AbsoluteFill>
      <Backdrop tone="warm" />
      <AbsoluteFill
        style={{ background: `radial-gradient(${mix(10, 60, glow)}% ${mix(10, 50, glow)}% at 50% 42%, rgba(233,184,114,0.55), transparent 70%)` }}
      />
      <div style={{ position: 'absolute', left: 0, right: 0, top: mix(g.logoY[0], g.logoY[1], lift), display: 'flex', justifyContent: 'center' }}>
        <Logo size={logoSize} color={colors.espresso} delay={timing.reveal.logo} />
      </div>
      <div style={{ position: 'absolute', left: g.laptop[0], top: g.laptop[1] + (1 - laptopIn) * 500, opacity: Math.min(1, laptopIn * 1.5) }}>
        <Laptop
          src={screens.homeDesktop}
          width={g.laptopW}
          camera={{ x: 0.5, y: 0.4, scale: mix(1.08, 1, drift) }}
          tilt={{ rx: mix(28, 10, laptopIn), ry: mix(-30, -14, laptopIn) + drift * 4, rz: mix(4, 1, laptopIn) }}
        />
      </div>
      <div style={{ position: 'absolute', left: g.phone[0], top: g.phone[1] + (1 - phoneIn) * 600 }}>
        <Phone
          src={screens.homeMobile}
          height={g.phoneH}
          camera={{ x: 0.5, y: 0.3, scale: 1 }}
          tilt={{ rx: mix(20, 6, phoneIn), ry: mix(30, 12, phoneIn) - drift * 4, rz: mix(-6, -2, phoneIn) }}
        />
      </div>
    </AbsoluteFill>
  );
}
