import type { SupabaseClient } from '@supabase/supabase-js';

export const MIN_AGE = 13;

const RESERVED = new Set([
  'admin', 'support', 'help', 'moderator', 'blackbull', 'settings', 'terminal',
  'explore', 'community', 'post', 'users', 'api', 'auth', 'about', 'privacy', 'terms',
]);

export function validateUsername(raw: string): string | null {
  const v = raw.trim();
  if (v.length < 3) return 'At least 3 characters.';
  if (v.length > 20) return 'At most 20 characters.';
  if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Only letters, numbers and underscores.';
  if (/^\d+$/.test(v)) return 'Must include at least one letter.';
  if (RESERVED.has(v.toLowerCase())) return 'This username is reserved.';
  return null;
}

export async function isUsernameTaken(supabase: SupabaseClient, name: string): Promise<boolean> {
  const pattern = name.trim().replace(/[\\%_]/g, (c) => '\\' + c);
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .ilike('username', pattern);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function suggestUsernames(supabase: SupabaseClient, base: string, limit = 3): Promise<string[]> {
  const root = base.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'user';
  const two = () => Math.floor(10 + Math.random() * 90);
  const three = () => Math.floor(100 + Math.random() * 900);
  const yr = String(new Date().getFullYear()).slice(2);
  const pool = Array.from(
    new Set([
      root + '_' + two(), root + two(), 'the_' + root, root + '_official',
      root + yr, root + '_' + two(), 'real_' + root, root + three(),
    ])
  ).filter((c) => validateUsername(c) === null);
  const checked = await Promise.all(
    pool.map(async (c) => {
      try { return (await isUsernameTaken(supabase, c)) ? null : c; } catch { return null; }
    })
  );
  return checked.filter((c): c is string => !!c).slice(0, limit);
}

export function isRealDate(y: number, m: number, d: number): boolean {
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function calcAge(y: number, m: number, d: number, now: Date = new Date()): number {
  let age = now.getFullYear() - y;
  const mm = now.getMonth() + 1;
  if (mm < m || (mm === m && now.getDate() < d)) age -= 1;
  return age;
}
