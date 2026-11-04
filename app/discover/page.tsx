"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DEFAULT_CHAIN, isChainId, type ChainId } from "@/lib/chains";
import { tokenHref, trendingToSnapshot } from "@/lib/toSnapshot";
import ChainChips from "@/components/ui/ChainChips";
import TokenRow from "@/components/ui/TokenRow";
import BottomNav from "@/components/ui/BottomNav";

type Sort = "trending" | "gainers" | "volume";
const SORTS: { key: Sort; label: string }[] = [
  { key: "trending", label: "Trending" },
  { key: "gainers", label: "Gainers" },
  { key: "volume", label: "Volume" },
];

export default function DiscoverPage() {
  const [chain, setChainState] = useState<ChainId>(DEFAULT_CHAIN);
  const [sort, setSort] = useState<Sort>("trending");
  const [raw, setRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bb_selected_chain");
      if (saved && isChainId(saved)) setChainState(saved);
    } catch {}
  }, []);

  function setChain(c: ChainId) {
    setChainState(c);
    try {
      localStorage.setItem("bb_selected_chain", c);
    } catch {}
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch(`/api/chain/trending?chain=${chain}`);
        if (!r.ok) throw new Error("bad");
        const j = await r.json();
        if (alive) {
          setRaw(Array.isArray(j.tokens) ? j.tokens : []);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    }
    setLoading(true);
    setRaw([]);
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [chain]);

  const rows = useMemo(() => {
    const list = raw.filter((t) => t.address);
    if (sort === "gainers") list.sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0));
    if (sort === "volume") list.sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0));
    return list;
  }, [raw, sort]);

  return (
    <div className="min-h-screen bg-bb-bg pb-20 text-white">
      <header className="sticky top-0 z-30 space-y-3 border-b border-bb-border bg-bb-bg/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Discover</h1>
          <Link
            href="/terminal/search"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-bb-raised text-zinc-300"
          >
            <Search className="h-5 w-5" />
          </Link>
        </div>
        <ChainChips value={chain} onChange={setChain} />
        <div className="flex gap-4 text-sm font-semibold">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={sort === s.key ? "text-white" : "text-zinc-500"}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {error && rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-bb-down">Could not load tokens. Pull to retry.</p>
      ) : loading && rows.length === 0 ? (
        <div className="space-y-2 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bb-skeleton h-20 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">No tokens right now.</p>
      ) : (
        rows.map((t) => (
          <TokenRow
            key={`${chain}-${t.address}`}
            token={trendingToSnapshot(t, chain)}
            href={tokenHref(t, chain)}
          />
        ))
      )}
      <BottomNav active="discover" />
    </div>
  );
}
