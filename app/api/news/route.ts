import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

const FEEDS = [
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss', category: 'crypto' },
  { source: 'Decrypt', url: 'https://decrypt.co/feed', category: 'crypto' },
  { source: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', category: 'sports' },
] as const;
type Feed = (typeof FEEDS)[number];

interface NewsItem {
  title: string;
  link: string;
  source: string;
  category: string;
  publishedAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: NewsItem[] }>();

function code(n: number) {
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}

function clean(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n) => code(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => code(parseInt(h, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string) {
  const m = new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>', 'i').exec(block);
  return m ? clean(m[1]) : '';
}

async function loadFeed(feed: Feed): Promise<NewsItem[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(feed.url, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: {
        'User-Agent': 'BlackBullStudio/1.0',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
    const out: NewsItem[] = [];
    for (const b of blocks.slice(0, 15)) {
      const title = tag(b, 'title');
      const link = tag(b, 'link');
      if (!title || !/^https?:\/\//.test(link)) continue;
      const t = Date.parse(tag(b, 'pubDate'));
      out.push({
        title,
        link,
        source: feed.source,
        category: feed.category,
        publishedAt: Number.isNaN(t) ? Date.now() : t,
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const cat = request.nextUrl.searchParams.get('cat');
  const category = cat === 'crypto' || cat === 'sports' ? cat : null;
  const key = category ?? 'all';

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return NextResponse.json({ items: hit.data });

  const feeds = FEEDS.filter((f) => !category || f.category === category);
  const results = await Promise.all(feeds.map((f) => loadFeed(f)));

  const seen = new Set<string>();
  const items = results
    .flat()
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((i) => {
      const k = i.title.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 30);

  if (!items.length && hit) return NextResponse.json({ items: hit.data });
  if (items.length) cache.set(key, { at: Date.now(), data: items });
  return NextResponse.json({ items });
}
