import { FeatureStage, ScreenSwap, target } from '../components/FeatureStage';
import { Cursor, Tap, Toast } from '../components/Ui';
import { springAt } from '../lib/motion';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { beats, copy, screens, springs } from '../video.config';

const FOCUS = beats(2);
const CLICK = beats(5.5);

/** Beat 4: the real tracking form; the code types into the real fields, then a click on Track. */
export function Deliver() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typed = springAt(frame, fps, FOCUS + 4, springs.camera);
  return (
    <FeatureStage
      eyebrow="Delivered to all 64 districts"
      caption={copy.deliver.caption}
      desktop={screens.trackDesktop}
      mobile={screens.trackMobile}
      screenOverlay={(s) => {
        const input = target(s, 'orderInput');
        const button = target(s, 'trackButton');
        if (!input || !button) return null;
        const wide = s.format === 'wide';
        // Band covering the real input fields, revealed left to right like typing.
        const top = input.y - input.h * 0.9;
        const bottom = wide ? input.y + input.h * 0.9 : button.y - button.h * 0.7;
        const right = wide ? button.left - 4 : s.screen.w;
        const reveal = input.left + (right - input.left) * typed;
        const clip = `polygon(0 ${top}px, ${reveal}px ${top}px, ${reveal}px ${bottom}px, 0 ${bottom}px)`;
        return (
          <>
            <ScreenSwap src={wide ? screens.trackFilledDesktop : screens.trackFilledMobile} clip={clip} />
            {wide ? (
              <Cursor
                stops={[
                  { at: beats(0.8), x: s.screen.w * 0.6, y: s.screen.h * 0.35 },
                  { at: beats(1.2), x: input.x, y: input.y, click: FOCUS },
                  { at: beats(4.3), x: button.x, y: button.y, click: CLICK },
                ]}
                size={36}
              />
            ) : (
              <>
                <Tap x={input.x} y={input.y} at={FOCUS} />
                <Tap x={button.x} y={button.y} at={CLICK} />
              </>
            )}
          </>
        );
      }}
      extras={(s) => (
        <Toast
          title={copy.deliver.toast.title}
          text={copy.deliver.toast.text}
          delay={CLICK + 8}
          scale={s.format === 'wide' ? 1 : 1.1}
          style={s.format === 'wide' ? { right: 90, top: s.device.y - 20 } : { left: 110, top: s.format === 'story' ? 700 : 450 }}
        />
      )}
    />
  );
}
