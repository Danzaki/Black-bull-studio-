export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'bb_theme';

export function getPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'light';
  } catch {
    return 'light';
  }
}

export function applyPref(p: ThemePref) {
  const dark = p === 'dark' || (p === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

export function setPref(p: ThemePref) {
  try { localStorage.setItem(KEY, p); } catch {}
  applyPref(p);
}
