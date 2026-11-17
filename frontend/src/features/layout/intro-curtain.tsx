import { LogoMark, Wordmark } from '@/shared/ui/logo';

/**
 * First visit of a session only (INTRO_SCRIPT in the [lang] layout adds html.intro): an
 * espresso curtain where the mark rises out of its line and the name settles in brass, then the
 * curtain lifts off the page (globals.css, "Intro curtain"), about 1.25 s in all. It never takes
 * clicks, is never shown with reduced motion or to automated browsers, and is display:none
 * otherwise, so it costs nothing on later pages.
 */
export function IntroCurtain() {
  return (
    <div aria-hidden className="intro-curtain">
      <div className="flex flex-col items-center gap-6">
        <span className="intro-mark block overflow-clip">
          <LogoMark className="h-16 w-auto text-brass" />
        </span>
        <span className="intro-name block text-ivory">
          <Wordmark className="text-[1.6rem]" />
        </span>
      </div>
    </div>
  );
}
