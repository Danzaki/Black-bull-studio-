"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";

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

const timeFmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const dateFmt = (d: Date) => d.toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" });

function TeamRow({ t }: { t: Team }) {
  return (
    <div className="flex items-center gap-3">
      {t.crest ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.crest} alt="" className="h-7 w-7 object-contain" loading="lazy" />
      ) : (
        <span className="h-7 w-7 rounded-full bg-bbl-text/10" />
      )}
      <span className="text-base font-semibold text-bbl-text">{t.tla || t.name.slice(0, 3).toUpperCase()}</span>
    </div>
  );
}

export default function FixtureCards({ limit = 10 }: { limit?: number }) {
  const [matches, setMatches] = useState<Fixture[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await authedFetch("/api/sports/fixtures", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (alive && res.ok) setMatches((json.matches ?? []) as Fixture[]);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!matches || !matches.length) return null;

  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
      {matches.slice(0, limit).map((m) => {
        const d = new Date(m.utcDate);
        return (
          <div key={m.id} title={m.competition} className="w-[180px] shrink-0 rounded-2xl border border-bbl-border bg-white/[0.04] p-4">
            <div className="flex items-center justify-between text-xs font-semibold text-bbl-muted">
              <span>{timeFmt(d)}</span>
              <span>{dateFmt(d)}</span>
            </div>
            <div className="my-2.5 border-t border-dashed border-bbl-border" />
            <div className="space-y-2.5">
              <TeamRow t={m.home} />
              <TeamRow t={m.away} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
