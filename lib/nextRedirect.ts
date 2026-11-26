const KEY = 'bb_next';

export function isSafeNext(p: unknown): p is string {
  return typeof p === 'string' && /^\/(?!\/)[\w\-\/?=&%.]*$/.test(p) && !p.startsWith('/auth');
}

export function rememberNext(p: string) {
  if (!isSafeNext(p)) return;
  try { localStorage.setItem(KEY, JSON.stringify({ p, t: Date.now() })); } catch {}
}

export function takeNext(fallback: string): string {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return fallback;
    const { p, t } = JSON.parse(raw);
    if (Date.now() - t > 30 * 60_000) return fallback;
    return isSafeNext(p) ? p : fallback;
  } catch {
    return fallback;
  }
}
