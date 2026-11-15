const HOLIDAYS = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
]);
const EARLY = new Set(['2026-11-27', '2026-12-24']);
const OPEN = 9 * 60 + 30;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Et = { date: string; dow: number; mins: number };

const FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hourCycle: 'h23',
});

function et(d: Date): Et {
  const p: Record<string, string> = {};
  for (const x of FMT.formatToParts(d)) p[x.type] = x.value;
  return { date: p.year + '-' + p.month + '-' + p.day, dow: DAYS.indexOf(p.weekday), mins: Number(p.hour) * 60 + Number(p.minute) };
}

const isTradingDay = (e: Et) => e.dow >= 1 && e.dow <= 5 && !HOLIDAYS.has(e.date);

function nextOpen(from: Date): Date | null {
  for (let i = 0; i < 10; i++) {
    const e = et(new Date(from.getTime() + i * 86_400_000));
    if (!isTradingDay(e)) continue;
    if (i === 0 && e.mins >= OPEN) continue;
    const [y, m, d] = e.date.split('-').map(Number);
    for (const off of [4, 5]) {
      const t = new Date(Date.UTC(y, m - 1, d, 9 + off, 30));
      const x = et(t);
      if (x.date === e.date && x.mins === OPEN) return t;
    }
  }
  return null;
}

export type MarketStatus = { state: 'open' | 'pre' | 'post' | 'closed'; label: string; detail: string };

export function usMarketStatus(now: Date = new Date()): MarketStatus {
  const e = et(now);
  const trading = isTradingDay(e);
  const close = EARLY.has(e.date) ? 13 * 60 : 16 * 60;
  const note = e.date.startsWith('2026') ? '' : ' Holidays not included.';
  if (trading && e.mins >= OPEN && e.mins < close) {
    return { state: 'open', label: 'US market open', detail: 'Closes ' + (close === 780 ? '1:00' : '4:00') + ' PM ET.' + note };
  }
  const next = nextOpen(now);
  const when = next ? next.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '';
  const detail = (next ? 'Opens ' + when + ' (your time).' : '') + note;
  if (trading && e.mins >= 4 * 60 && e.mins < OPEN) return { state: 'pre', label: 'Pre-market', detail };
  if (trading && e.mins >= close && e.mins < 20 * 60) return { state: 'post', label: 'After hours', detail };
  return { state: 'closed', label: 'US market closed', detail };
}
