const VIEWED = 'bb_viewed_posts';
const HIDDEN = 'bb_hidden_posts';
let viewed: Set<string> | null = null;
let hidden: Set<string> | null = null;

function load(key: string): Set<string> {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'));
  } catch {
    return new Set<string>();
  }
}
function save(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set).slice(-500)));
  } catch {}
}

export function hasViewed(id: string): boolean {
  if (!viewed) viewed = load(VIEWED);
  return viewed.has(id);
}
export function markViewed(id: string) {
  if (!viewed) viewed = load(VIEWED);
  viewed.add(id);
  save(VIEWED, viewed);
}
export function isHidden(id: string): boolean {
  if (!hidden) hidden = load(HIDDEN);
  return hidden.has(id);
}
export function hidePost(id: string) {
  if (!hidden) hidden = load(HIDDEN);
  hidden.add(id);
  save(HIDDEN, hidden);
}
