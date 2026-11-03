"use client";

import { useEffect, useState } from "react";
import { PieChart, HelpCircle } from "lucide-react";
import { useChain } from "@/lib/chains/ChainContext";
import { useChainTrending } from "@/hooks/useChainTrending";
import EvmWalletStatsModal from "./EvmWalletStatsModal";

interface Holder {
  address: string;
  pct: number;
  balance: number;
  isContract: boolean;
  isLocked: boolean;
}

function compactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

const ADDR = /^0x[a-fA-F0-9]{40}$/;

export default function EvmHolderBubbles() {
  const { chain, chainId } = useChain();
  const { data: trending } = useChainTrending();

  const [token, setToken] = useState<{ address: string; symbol: string } | null>(null);
  const [input, setInput] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setToken(null);
    setData(null);
    setInput("");
    setError("");
  }, [chainId]);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/chain/security?chain=${chainId}&address=${token.address}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error === "no data" ? "No holder data for this token." : j.error || "Failed to load holders.");
        return j;
      })
      .then((j) => alive && setData(j))
      .catch((e) => alive && setError(e?.message || "Failed to load holders."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token, chainId]);

  function submitAddress(e: React.FormEvent) {
    e.preventDefault();
    const a = input.trim();
    if (!ADDR.test(a)) {
      setError("Enter a valid 0x contract address.");
      return;
    }
    setToken({ address: a.toLowerCase(), symbol: "TOKEN" });
  }

  const holders: Holder[] = data?.holders ?? [];
  const top10 = holders.slice(0, 10).reduce((s, h) => s + h.pct, 0);
  const devAddrs = new Set([data?.creator, data?.owner].filter(Boolean).map((a: string) => a.toLowerCase()));

  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-bb-border pb-2">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-bb-accent" />
          <h3 className="text-sm font-semibold text-white">{chain.name} holder distribution</h3>
        </div>
        <span className="text-xs text-zinc-400">Top 10 holders</span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-zinc-500">Pick a trending token or paste a contract address</p>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {(trending ?? []).slice(0, 12).map((t: any) =>
            t.address ? (
              <button
                key={t.pool}
                onClick={() => setToken({ address: String(t.address).toLowerCase(), symbol: t.name })}
                className={`h-9 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-all active:scale-95 ${
                  token?.address === String(t.address).toLowerCase()
                    ? "bg-bb-accent text-black"
                    : "border border-bb-border bg-bb-raised text-zinc-400 hover:text-white"
                }`}
              >
                {t.name}
              </button>
            ) : null
          )}
        </div>
        <form onSubmit={submitAddress} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="0x... contract address"
            className="h-11 min-w-0 flex-1 rounded-xl border border-bb-border bg-bb-raised px-3 text-base text-white placeholder-zinc-600 focus:border-bb-accent focus:outline-none"
          />
          <button type="submit" className="h-11 rounded-xl bg-bb-accent px-4 text-sm font-semibold text-black active:scale-95">
            Go
          </button>
        </form>
      </div>

      {!token ? (
        <p className="py-6 text-center text-sm text-zinc-500">Select a token to view holder bubbles.</p>
      ) : loading ? (
        <div className="space-y-2 py-2">
          <div className="bb-skeleton h-10" />
          <div className="bb-skeleton h-20" />
        </div>
      ) : error ? (
        <p className="py-6 text-center text-sm text-bb-down">{error}</p>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-2 gap-2.5 text-center text-sm">
            <div className="rounded-xl border border-bb-border bg-bb-raised p-3">
              <span className="block text-xs text-zinc-400">Top 10 Hold</span>
              <span className={`text-base font-semibold tabular-nums ${top10 > 50 ? "text-bb-down" : "text-white"}`}>{top10.toFixed(2)}%</span>
            </div>
            <div className="rounded-xl border border-bb-border bg-bb-raised p-3">
              <span className="flex items-center justify-center gap-1 text-xs text-zinc-400">
                Dev / Owner <HelpCircle className="h-3.5 w-3.5" />
              </span>
              <span className="text-base font-semibold text-amber-400">
                {data.creatorPercent !== null && data.creatorPercent !== undefined
                  ? `${data.creatorPercent.toFixed(2)}%`
                  : data.ownerPercent !== null && data.ownerPercent !== undefined
                  ? `${data.ownerPercent.toFixed(2)}%`
                  : "N/A"}
              </span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-zinc-500">
            {Number(data.holderCount).toLocaleString()} total holders. Showing the largest holders reported on-chain. Contracts are usually liquidity pools, vaults or lockers.
          </p>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Holder Allocation Bar</span>
              <span>100% Total Supply</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full border border-bb-border bg-bb-raised p-0.5">
              {holders.map((h, i) => (
                <div
                  key={i}
                  style={{ width: `${h.pct}%` }}
                  className={`h-full rounded-sm transition-all ${
                    h.isContract ? "bg-bb-up" : devAddrs.has(h.address.toLowerCase()) ? "bg-bb-down" : "bg-amber-500"
                  }`}
                  title={`${h.address.slice(0, 6)}...: ${h.pct.toFixed(2)}%`}
                />
              ))}
              <div className="flex-1 bg-bb-surface" title="Remaining Supply" />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-bb-up" /> Contract (LP/Vault)</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-bb-down" /> Dev / Owner</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Other Holders</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            {holders.map((h, i) => {
              const isDev = devAddrs.has(h.address.toLowerCase());
              return (
                <button
                  key={h.address}
                  onClick={() => !h.isContract && setSelected(h.address)}
                  disabled={h.isContract}
                  className="flex min-h-[52px] w-full items-center justify-between rounded-xl border border-bb-border bg-bb-raised px-3 py-2 text-left text-sm transition-colors active:bg-bb-surface disabled:opacity-80"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-xs text-zinc-500">#{i + 1}</span>
                    <span className="truncate font-semibold text-white">
                      {h.address.slice(0, 6)}...{h.address.slice(-4)}
                    </span>
                    {isDev && (
                      <span className="shrink-0 rounded-md border border-bb-down/20 bg-bb-down/10 px-1.5 py-0.5 text-[11px] text-bb-down">DEV?</span>
                    )}
                    {h.isContract && (
                      <span className="shrink-0 rounded-md border border-bb-up/20 bg-bb-up/10 px-1.5 py-0.5 text-[11px] text-bb-up">
                        {h.isLocked ? "LOCKED" : "LP/VAULT"}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs tabular-nums text-zinc-400">{compactNumber(h.balance)}</span>
                    <span className="font-semibold tabular-nums text-white">{h.pct.toFixed(2)}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {selected && token && (
        <EvmWalletStatsModal
          chain={chainId}
          wallet={selected}
          token={token.address}
          tokenSymbol={token.symbol !== "TOKEN" ? token.symbol : undefined}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
