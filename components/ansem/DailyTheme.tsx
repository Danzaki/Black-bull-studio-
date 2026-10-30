'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Flame } from 'lucide-react';

const THEMES: { title: string; prompt: string }[] = [
  { title: 'Bull in ancient Rome', prompt: 'a muscular black bull in a Roman gladiator arena, wearing a golden laurel crown, cinematic photo, golden hour, black and gold' },
  { title: 'Bull on the moon', prompt: 'a black bull planting a flag on the moon, wearing a space suit, 3D render, dramatic lighting, silver and white' },
  { title: 'Bull at the market', prompt: 'a black bull walking through a busy African street market, bright and playful, comic book style, red and orange' },
  { title: 'Bull chef', prompt: 'a black bull chef cooking in a fancy kitchen, wearing a chef hat, claymation style, bright and playful' },
  { title: 'Bull in the rain', prompt: 'a lonely black bull walking through neon rain at night, synthwave style, glowing neon, electric blue and purple' },
  { title: 'Bull astronaut', prompt: 'an astronaut bull floating next to a space station, low poly 3D, high contrast, teal and pink' },
  { title: 'Bull pirate', prompt: 'a pirate bull steering a ship in a storm, oil painting, dramatic lighting, black and gold' },
  { title: 'Bull DJ', prompt: 'a bull DJ at a rooftop party, wearing headphones, glowing neon, vintage poster style, red and orange' },
  { title: 'Bull samurai', prompt: 'a samurai bull standing in a bamboo forest at dawn, anime style, soft dreamy glow, emerald green' },
  { title: 'Bull superhero', prompt: 'a bull superhero flying over a city skyline, wearing a cape, comic book style, bright and playful, red and orange' },
  { title: 'Bull wizard', prompt: 'a wizard bull casting a golden spell in an ancient library, watercolor painting, golden hour, black and gold' },
  { title: 'Bull boxer', prompt: 'a bull boxer in a ring under spotlights, wearing gloves, cinematic photo, high contrast, black and orange' },
  { title: 'Bull king', prompt: 'a bull king on a throne in a grand hall, wearing a crown, oil painting, dramatic lighting, black and gold' },
  { title: 'Bull explorer', prompt: 'a bull explorer hiking up a snowy mountain, wearing a backpack, vintage poster style, golden hour, silver and white' },
];

export default function DailyTheme() {
  const [i, setI] = useState<number | null>(null);
  useEffect(() => { setI(Math.floor(Date.now() / 86400000) % THEMES.length); }, []);
  if (i === null) return <div className="h-28 animate-pulse rounded-2xl border border-bbl-border bg-bbl-surface" />;
  const t = THEMES[i];
  return (
    <div className="rounded-2xl border border-bbl-accent/40 bg-bbl-accent/5 p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-bbl-accent"><Flame className="h-3.5 w-3.5" /> Today&apos;s theme</p>
      <p className="mt-1 text-xl font-black">{t.title}</p>
      <p className="mt-1 text-xs text-bbl-muted">Create it, then post with <b>#BullDaily</b>. A new theme every day.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href={`/studio?remix=${encodeURIComponent(t.prompt)}`} className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-bbl-accent text-sm font-bold text-white active:scale-95"><Sparkles className="h-4 w-4" /> Make it</Link>
        <Link href="/create-post" className="flex h-10 items-center justify-center rounded-full border border-bbl-border text-sm font-bold active:scale-95">Post it</Link>
      </div>
    </div>
  );
}
