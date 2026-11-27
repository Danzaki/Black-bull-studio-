// In-app actions the assistant may propose. Everything is validated against a
// strict allowlist and only runs after the user taps the card.
export type AIAction =
  | { type: 'draft_post'; content: string }
  | { type: 'studio_prompt'; prompt: string }
  | { type: 'open_token'; mint: string }
  | { type: 'navigate'; path: string };

export const NAV_ALLOWLIST = [
  '/explore', '/discover', '/studio', '/terminal', '/create-post',
  '/search', '/notifications', '/bookmarks', '/settings',
];

const SOL_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function validate(a: any): AIAction | null {
  if (!a || typeof a !== 'object') return null;
  switch (a.type) {
    case 'draft_post':
      return typeof a.content === 'string' && a.content.trim()
        ? { type: 'draft_post', content: a.content.slice(0, 5000) } : null;
    case 'studio_prompt':
      return typeof a.prompt === 'string' && a.prompt.trim()
        ? { type: 'studio_prompt', prompt: a.prompt.slice(0, 400) } : null;
    case 'open_token':
      return typeof a.mint === 'string' && SOL_MINT.test(a.mint) ? { type: 'open_token', mint: a.mint } : null;
    case 'navigate':
      return typeof a.path === 'string' && NAV_ALLOWLIST.includes(a.path) ? { type: 'navigate', path: a.path } : null;
    default:
      return null;
  }
}

export function parseActions(raw: string): { text: string; actions: AIAction[] } {
  const re = /```action\s*([\s\S]*?)```/g;
  const actions: AIAction[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) && actions.length < 3) {
    try {
      const a = validate(JSON.parse(m[1]));
      if (a) actions.push(a);
    } catch {}
  }
  // also hide a block that is still streaming in
  const text = raw.replace(re, '').replace(/```action[\s\S]*$/, '').trim();
  return { text, actions };
}

export function describeAction(a: AIAction): { title: string; detail: string; cta: string } {
  switch (a.type) {
    case 'draft_post': return { title: 'Draft post', detail: a.content.slice(0, 120), cta: 'Open in Create Post' };
    case 'studio_prompt': return { title: 'Studio prompt', detail: a.prompt, cta: 'Open in Studio' };
    case 'open_token': return { title: 'Token', detail: a.mint.slice(0, 6) + '…' + a.mint.slice(-4), cta: 'Open in Terminal' };
    case 'navigate': return { title: 'Go to', detail: a.path, cta: 'Open' };
  }
}
