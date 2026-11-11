// Tuning knobs for the "For You" feed. Change the numbers here, nothing else.
export const RANK = {
  poolHours: 48,
  halfLifeHours: 8,
  replyWeight: 4,
  repostWeight: 2,
  likeWeight: 1,
  followBoost: 1.6,
  mutualBoost: 2.0,
  verifiedBoost: 1.2,
  diversityDecay: 0.7,
  pinMinutes: 30,
};

export type Relations = { following: Set<string>; mutuals: Set<string>; me?: string | null };

type Scored = { it: any; score: number; author: string };

export function rankItems(items: any[], counts: Record<string, number>, rel: Relations, now: number = Date.now()): any[] {
  const scored: Scored[] = [];
  for (const it of items) {
    if (!it || !it.post) continue;
    const base = it.kind === 'quote' && it.quotedPost ? it.quotedPost : it.post;
    const t = new Date(it.sortKey).getTime();
    const ageH = Number.isFinite(t) ? Math.max(0, (now - t) / 3_600_000) : 999;
    const recency = Math.pow(0.5, ageH / RANK.halfLifeHours);
    const eng =
      RANK.replyWeight * (Number(base.comments_count) || 0) +
      RANK.repostWeight * (counts[base.id] ?? 0) +
      RANK.likeWeight * (Number(base.likes_count) || 0);
    const author: string = String(it.post.user_id ?? '');
    const reposter: string = it.kind === 'repost' && it.repostedBy ? String(it.repostedBy.id ?? '') : '';
    let relMult = 1;
    for (const id of [author, reposter]) {
      if (!id) continue;
      if (rel.mutuals.has(id)) relMult = Math.max(relMult, RANK.mutualBoost);
      else if (rel.following.has(id)) relMult = Math.max(relMult, RANK.followBoost);
    }
    const verified = it.post.profiles?.verified ? RANK.verifiedBoost : 1;
    const mine = !!rel.me && (author === rel.me || reposter === rel.me);
    const pinned = ageH * 60 <= RANK.pinMinutes && (mine || rel.following.has(author) || rel.mutuals.has(author));
    scored.push({ it, score: recency * (1 + Math.log(1 + eng)) * relMult * verified * (pinned ? 1000 : 1), author });
  }

  const out: any[] = [];
  const seen = new Map<string, number>();
  while (scored.length > 0) {
    let bi = 0;
    let bs = -1;
    for (let i = 0; i < scored.length; i++) {
      const s = scored[i].score * Math.pow(RANK.diversityDecay, seen.get(scored[i].author) ?? 0);
      if (s > bs) {
        bs = s;
        bi = i;
      }
    }
    const [x] = scored.splice(bi, 1);
    seen.set(x.author, (seen.get(x.author) ?? 0) + 1);
    out.push(x.it);
  }
  return out;
}
