import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/supabaseServer';

export const maxDuration = 20;

// Gasa na kyauta (ka canza idan kana so)
const COMPETITIONS = 'PL,ELC,PD,SA,BL1,PPL,DED,FL1,BSA,CL';
const TTL_MS = 60 * 60 * 1000;
const RETRY_AFTER_FAIL_MS = 2 * 60 * 1000;
const WINDOW_DAYS = 8;
const MAX_MATCHES = 20;

interface Team {
  name: string;
  tla: string;
  crest: string | null;
}
interface Fixture {
  id: number;
  utcDate: string;
  competition: string;
  home: Team;
  away: Team;
}

let cache: { at: number; data: Fixture[] } | null = null;
let lastFail = 0;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const team = (t: any): Team => ({
  name: String(t?.shortName || t?.name || ''),
  tla: String(t?.tla || ''),
  crest: typeof t?.crest === 'string' ? t.crest : null,
});

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return NextResponse.json({ error: 'Sports data is not configured.' }, { status: 503 });

  if (cache && Date.now() - cache.at < TTL_MS) return NextResponse.json({ matches: cache.data });
  if (Date.now() - lastFail < RETRY_AFTER_FAIL_MS) return NextResponse.json({ matches: cache?.data ?? [] });

  const from = new Date();
  const to = new Date(Date.now() + WINDOW_DAYS * 86400000);
  const url =
    'https://api.football-data.org/v4/matches?competitions=' + COMPETITIONS +
    '&dateFrom=' + ymd(from) + '&dateTo=' + ymd(to);

  try {
    const res = await fetch(url, { headers: { 'X-Auth-Token': key }, cache: 'no-store' });
    if (!res.ok) {
      console.error('football-data failed', res.status, (await res.text()).slice(0, 200));
      lastFail = Date.now();
      return NextResponse.json({ matches: cache?.data ?? [] });
    }
    const json = await res.json();
    const now = Date.now();
    const matches: Fixture[] = ((json.matches ?? []) as any[])
      .filter((m) => (m.status === 'SCHEDULED' || m.status === 'TIMED') && Date.parse(m.utcDate) > now)
      .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))
      .slice(0, MAX_MATCHES)
      .map((m) => ({
        id: m.id,
        utcDate: m.utcDate,
        competition: String(m.competition?.name || ''),
        home: team(m.homeTeam),
        away: team(m.awayTeam),
      }));
    cache = { at: Date.now(), data: matches };
    return NextResponse.json({ matches });
  } catch (e) {
    console.error('football-data error', e);
    lastFail = Date.now();
    return NextResponse.json({ matches: cache?.data ?? [] });
  }
}
