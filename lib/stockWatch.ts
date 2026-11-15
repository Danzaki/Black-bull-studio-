const KEY = 'bb_stock_watch';

export function loadWatch(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' && /^0x[a-f0-9]{40}$/.test(x)).slice(0, 200) : [];
  } catch {
    return [];
  }
}

export function saveWatch(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}
}
