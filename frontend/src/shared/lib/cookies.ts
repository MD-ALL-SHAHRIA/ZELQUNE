/** Browser-side access to the storefront's own first-party cookies. */
export function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${name}=`;
  const found = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  return found ? decodeURIComponent(found.slice(prefix.length)) : undefined;
}

export function writeCookie(name: string, value: string, maxAgeSeconds: number): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax${secure}`;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}
