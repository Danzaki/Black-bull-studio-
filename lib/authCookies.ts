import type { Session } from '@supabase/supabase-js';

function getCookieOptions(maxAge: number) {
  const secureFlag = typeof window !== 'undefined' && window.location.protocol === 'https:' ? ' Secure;' : '';
  return `Path=/; SameSite=Lax; Max-Age=${maxAge};${secureFlag}`;
}

export function setAuthCookies(session: Session) {
  if (typeof window === 'undefined' || !session) {
    return;
  }

  const expiresAt = session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
  const accessTokenAge = Math.max(expiresAt - Math.floor(Date.now() / 1000), 60);
  const refreshTokenAge = 60 * 60 * 24 * 30;

  const options = getCookieOptions(accessTokenAge);
  document.cookie = `sb-access-token=${encodeURIComponent(session.access_token)}; ${options}`;
  document.cookie = `sb-refresh-token=${encodeURIComponent(session.refresh_token)}; ${getCookieOptions(refreshTokenAge)}`;
}

export function clearAuthCookies() {
  if (typeof window === 'undefined') {
    return;
  }

  document.cookie = 'sb-access-token=; Path=/; Max-Age=0;';
  document.cookie = 'sb-refresh-token=; Path=/; Max-Age=0;';
}
