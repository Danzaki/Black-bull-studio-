'use client';

import { useEffect, useState } from 'react';
import { getPref, setPref, type ThemePref } from '@/lib/theme';

const OPTS: { v: ThemePref; label: string }[] = [
  { v: 'light', label: 'Light' },
  { v: 'dark', label: 'Dark' },
  { v: 'system', label: 'System' },
];

export default function ThemeSwitch() {
  const [pref, setP] = useState<ThemePref>('light');
  useEffect(() => { setP(getPref()); }, []);
  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-[13px] font-semibold text-bbl-muted">Appearance</p>
      <div className="flex gap-1 rounded-xl border border-bbl-border bg-bbl-surface p-1">
        {OPTS.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => { setPref(o.v); setP(o.v); }}
            className={'h-10 flex-1 rounded-lg text-[14px] font-semibold ' + (pref === o.v ? 'bg-bbl-accent text-white' : 'text-bbl-text')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
