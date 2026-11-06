import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FeatureStage, ScreenSwap, target, type Stage } from '../components/FeatureStage';
import { Cursor, Tap, Toast } from '../components/Ui';
import { typedCount, typingSchedule } from '../lib/typing';
import { colors, copy, screens, timing } from '../video.config';

const T = timing.deliver;
const schedule = typingSchedule();

/** Beat 4: the real tracking form; the order code and phone number type in, then Track. */
export function Deliver() {
  const frame = useCurrentFrame();

  const typed = (s: Stage) => {
    const wide = s.format === 'wide';
    const filled = wide ? screens.trackFilledDesktop : screens.trackFilledMobile;
    return (['orderText', 'phoneText'] as const).map((name, i) => {
      const box = target(s, name);
      if (!box) return null;
      const f = schedule.fields[i];
      const n = typedCount(frame, f.start, f.text.length, schedule.perChar);
      const x0 = box.left - 2;
      const x1 = box.left + (box.w * n) / f.text.length;
      const top = box.y - box.h * 0.42;
      const bottom = box.y + box.h * 0.42;
      const typing = frame >= f.start - 4 && frame < f.start + f.text.length * schedule.perChar + 10;
      return (
        <AbsoluteFill key={name}>
          {n > 0 && <ScreenSwap src={filled} clip={`polygon(${x0}px ${top}px, ${x1 + 1}px ${top}px, ${x1 + 1}px ${bottom}px, ${x0}px ${bottom}px)`} />}
          {typing && frame % 14 < 9 && (
            <div style={{ position: 'absolute', left: x1 + 2, top: box.y - box.h * 0.22, width: wide ? 1.5 : 2, height: box.h * 0.44, background: colors.espresso }} />
          )}
        </AbsoluteFill>
      );
    });
  };

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
        return (
          <>
            {typed(s)}
            {s.format === 'wide' ? (
              <Cursor
                stops={[
                  { at: T.cursorIn, x: s.screen.w * 0.6, y: s.screen.h * 0.35 },
                  { at: T.cursorMove, x: input.x, y: input.y, click: T.focus },
                  { at: T.buttonMove, x: button.x, y: button.y, click: T.click },
                ]}
                size={36}
              />
            ) : (
              <>
                <Tap x={input.x} y={input.y} at={T.focus} />
                <Tap x={button.x} y={button.y} at={T.click} />
              </>
            )}
          </>
        );
      }}
      extras={(s) => (
        <Toast
          title={copy.deliver.toast.title}
          text={copy.deliver.toast.text}
          delay={T.toast}
          scale={s.format === 'wide' ? 1 : 1.1}
          style={s.format === 'wide' ? { right: 90, top: s.device.y - 20 } : { left: 110, top: s.format === 'story' ? 700 : 450 }}
        />
      )}
    />
  );
}
