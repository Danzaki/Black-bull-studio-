export type Level = 'safe' | 'caution' | 'warning' | 'danger' | 'unknown';

const PLAIN: Record<string, string> = {
  Honeypot: 'You may not be able to sell this token',
  'Cannot sell all': 'Sellers may be blocked from selling everything',
  Mintable: 'The owner can create more tokens',
  'Hidden owner': 'A hidden owner can still control the contract',
  'Owner can reclaim ownership': 'The owner can take control back',
  'Owner can change balances': 'The owner can change what wallets hold',
  'Blacklist function': 'Wallets can be blocked from trading',
  'Transfers can be paused': 'The owner can freeze transfers',
  'Contract not verified': 'The code is not public, so it cannot be checked',
};

export function plainRisk(r: string): string {
  if (PLAIN[r]) return PLAIN[r];
  const m = r.match(/(\d+(?:\.\d+)?)%/);
  if (r.startsWith('High buy tax')) return 'Buying costs about ' + (m ? m[1] : '10+') + '% in tax';
  if (r.startsWith('High sell tax')) return 'Selling costs about ' + (m ? m[1] : '10+') + '% in tax';
  return r;
}

const TEXT: Record<string, { h: string; s: string }> = {
  safe: { h: 'No red flags found', s: 'Our checks found nothing alarming. This is not a guarantee.' },
  caution: { h: 'Some risks found', s: 'Read the warnings before you decide.' },
  warning: { h: 'Risky token', s: 'Several warning signs. Only risk what you can lose.' },
  danger: { h: 'Do not buy', s: 'Serious red flags. You could lose everything you put in.' },
  unknown: { h: 'No security data', s: 'Treat this token as unverified and high risk.' },
};

export const headline = (level: string) => (TEXT[level] ?? TEXT.unknown).h;
export const subline = (level: string) => (TEXT[level] ?? TEXT.unknown).s;
