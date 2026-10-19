import { type NextRequest, NextResponse } from 'next/server';
import { decideRoute } from './shared/lib/routing';

export function proxy(request: NextRequest) {
  const cookies = Object.fromEntries(request.cookies.getAll().map((c) => [c.name, c.value]));
  const decision = decideRoute(request.nextUrl, cookies, () =>
    crypto.randomUUID().replaceAll('-', ''),
  );
  if (decision.kind === 'redirect') {
    return NextResponse.redirect(new URL(decision.location, request.url), 307);
  }
  const target = request.nextUrl.clone();
  target.pathname = decision.pathname;
  const response = NextResponse.rewrite(target);
  for (const c of decision.cookies) {
    response.cookies.set(c.name, c.value, {
      maxAge: c.maxAge,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'https:',
    });
  }
  return response;
}

export const config = {
  // Pages only: skip Next internals, metadata files and anything with a file extension.
  matcher: ['/((?!_next/|favicon.ico|robots.txt|sitemap.xml|(?:en|bn)/opengraph-image|.*\\..*).*)'],
};
