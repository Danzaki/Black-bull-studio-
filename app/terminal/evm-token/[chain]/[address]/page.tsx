"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { getChain, isChainId, explorerTokenUrl } from "@/lib/chains";

const TABS = ["Markets", "Detail", "Risk"] as const;
type Tab = (typeof TABS)[number];

const SUB = "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089";

function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n) || n === 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPrice(p: number | null | undefined): string {
  if (!p || !Number.isFinite(p)) return "—";
  if (p >= 1) return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  const zeros = Math.floor(-Math.log10(p)) - 1;
  if (zeros >= 4) {
    const digits = Math.round(p * Math.pow(10, zeros + 4)).toString().slice(0, 4);
    const sub = String(zeros).split("").map((d) => SUB[Number(d)]).join("");
    return `$0.0${sub}${digits}`;
  }
  return `$${p.toFixed(6)}`;
}

function shortAddr(v: string): string {
  return v.length <= 12 ? v : `${v.slice(0, 6)}…${v.slice(-6)}`;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bb-skeleton ${className}`} aria-hidden="true" />;
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{title}</h2>
    </div>
  );
}

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex min-h-14 flex-col justify-center gap-1 border-b border-bb-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="flex min-w-0 items-center gap-2 sm:max-w-[70%]">
        <span className="truncate text-xs text-zinc-300">{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-bb-raised hover:text-white"
            aria-label={`Copy ${label}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-bold tabular-nums text-zinc-100">{value}</p>
    </div>
  );
}

const LEVEL_STYLE: Record<string, string> = {
  safe: "border-bb-up/20 bg-bb-up/10 text-bb-up",
  caution: "border-amber-500/20 bg-amber-500/5 text-amber-400",
  warning: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  danger: "border-bb-down/30 bg-bb-down/10 text-bb-down",
};

function EvmTokenInner() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();

  const chainParam = String(params?.chain ?? "");
  const address = String(params?.address ?? "");
  const chain = getChain(chainParam);
  const valid = isChainId(chainParam) && chain.type === "evm";

  const [token, setToken] = useState<any>(null);
  const [security, setSecurity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [secLoading, setSecLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("Markets");

  useEffect(() => {
    if (!valid || !address) return;
    let alive = true;
    const load = () =>
      fetch(`/api/chain/token?chain=${chain.id}&address=${address}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (alive) { setToken(j); setLoading(false); } })
        .catch(() => { if (alive) setLoading(false); });
    load();
    const t = setInterval(load, 15000);
    return () => { alive = false; clearInterval(t); };
  }, [valid, chain.id, address]);

  useEffect(() => {
    if (!valid || !address) return;
    let alive = true;
    fetch(`/api/chain/security?chain=${chain.id}&address=${address}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) { setSecurity(j); setSecLoading(false); } })
      .catch(() => { if (alive) setSecLoading(false); });
    return () => { alive = false; };
  }, [valid, chain.id, address]);

  if (!valid) {
    return <div className="min-h-screen bg-bb-bg p-6 text-center text-zinc-400">Unsupported chain.</div>;
  }

  const symbol = token?.symbol || search.get("symbol") || "TOKEN";
  const pool: string | null = token?.pool || search.get("pool");
  const change = token?.change24h as number | null | undefined;
  const isUp = change != null && change >= 0;
  const scanName = chain.id === "bsc" ? "BscScan" : "BaseScan";
  const dexUrl = pool ? `https://dexscreener.com/${chain.id}/${pool}` : null;

  async function copyText(text: string, flag = false) {
    try {
      await navigator.clipboard.writeText(text);
      if (flag) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-bb-bg pb-24 text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-bb-border/90 bg-bb-bg/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-3 sm:px-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-bb-raised hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 items-center gap-2">
            {token?.imageUrl ? (
              <img src={token.imageUrl} alt={symbol} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-white/10" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-bb-border bg-bb-surface text-[11px] font-black text-zinc-300">
                {symbol.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-bold text-white">{symbol}</span>
                {token?.name && <span className="hidden text-[11px] text-zinc-600 sm:inline">{token.name}</span>}
              </div>
              <button
                type="button"
                onClick={() => void copyText(address, true)}
                className="flex items-center gap-1 text-[11px] text-zinc-600 transition hover:text-zinc-300"
              >
                <span>{shortAddr(address)}</span>
                {copied ? <Check className="h-3 w-3 text-bb-accent" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>

          <a
            href={explorerTokenUrl(chain.id, address)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-bb-border px-2.5 text-[11px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-white"
          >
            {scanName}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px]">
        <section className="flex items-start justify-between gap-4 px-3 pt-4 sm:px-5">
          <div className="min-w-0">
            <span className="rounded-md border border-bb-up/20 bg-bb-up/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-bb-accent">
              {chain.name}
            </span>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
              {loading ? (
                <Skeleton className="h-10 w-44" />
              ) : (
                <h1 className={`text-2xl font-black tracking-tight sm:text-3xl ${change == null ? "text-white" : isUp ? "text-bb-up" : "text-bb-down"}`}>
                  {fmtPrice(token?.priceUsd)}
                </h1>
              )}
              {change != null && (
                <span className={`mb-1 rounded-md px-2 py-1 text-xs font-bold ${isUp ? "bg-bb-up/10 text-bb-up" : "bg-bb-down/10 text-bb-down"}`}>
                  {isUp ? "+" : ""}{change.toFixed(2)}%
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 space-y-1.5 text-right">
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">MC</span>
              <span className="font-bold text-white">{compact(token?.marketCap)}</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">Liq</span>
              <span className="font-bold text-white">{compact(token?.liquidity)}</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">Vol</span>
              <span className="font-bold text-white">{compact(token?.volume24h)}</span>
            </div>
            <div className="flex items-center justify-end gap-2 text-sm">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">B/S</span>
              <span className="font-bold">
                <span className="text-bb-up">{token?.buys24h ?? "—"}</span>
                <span className="mx-1 text-zinc-700">/</span>
                <span className="text-bb-down">{token?.sells24h ?? "—"}</span>
              </span>
            </div>
          </div>
        </section>

        <nav className="sticky top-14 z-30 mt-4 border-b border-bb-border bg-bb-bg/95 px-3 backdrop-blur-xl sm:px-5">
          <div className="no-scrollbar flex gap-5 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`relative whitespace-nowrap py-3.5 text-sm font-semibold transition ${
                  tab === t ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {t}
                {tab === t && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-bb-accent" />}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-3 py-5 sm:px-5">
          {tab === "Markets" && (
            <section className="min-w-0">
              <div className="h-[55vh] overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
                {pool ? (
                  <iframe
                    title="chart"
                    src={`https://www.geckoterminal.com/${chain.geckoNetwork}/pools/${pool}?embed=1&info=0&swaps=0&light_chart=0`}
                    className="h-full w-full border-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    {loading ? "Loading chart…" : "No pool found for this token."}
                  </div>
                )}
              </div>
            </section>
          )}

          {tab === "Detail" && (
            <section className="max-w-5xl">
              <SectionTitle title="Token details" />
              <div className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
                <DetailRow label="Name" value={token?.name || "—"} />
                <DetailRow label="Symbol" value={`$${symbol}`} />
                <DetailRow label="Chain" value={chain.name} />
                <DetailRow label="Decimals" value={token?.decimals != null ? String(token.decimals) : "—"} />
                <DetailRow label="Address" value={shortAddr(address)} onCopy={() => void copyText(address)} />
                <DetailRow label="Pool" value={pool ? shortAddr(pool) : "—"} onCopy={pool ? () => void copyText(pool) : undefined} />
                <DetailRow label="Price" value={fmtPrice(token?.priceUsd)} />
                <DetailRow label="Market cap" value={compact(token?.marketCap)} />
                <DetailRow label="Fully diluted valuation" value={compact(token?.fdv)} />
                <DetailRow label="Liquidity" value={compact(token?.liquidity)} />
                <DetailRow label="Volume 24h" value={compact(token?.volume24h)} />
                <DetailRow label="Buys / sells 24h" value={`${token?.buys24h ?? "—"} / ${token?.sells24h ?? "—"}`} />
              </div>
            </section>
          )}

          {tab === "Risk" && (
            <section className="max-w-5xl">
              <SectionTitle title="Security scan" />
              {secLoading ? (
                <Skeleton className="h-36 w-full rounded-2xl" />
              ) : !security ? (
                <div className="rounded-2xl border border-bb-border bg-bb-bg px-5 py-10 text-center">
                  <p className="text-sm font-medium text-zinc-300">No security data</p>
                  <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-zinc-600">
                    GoPlus has no report for this token yet. Treat it as unverified.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold uppercase tracking-wider ${LEVEL_STYLE[security.level] ?? LEVEL_STYLE.caution}`}>
                      {security.level === "safe" ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                      {security.level}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <InfoBox label="Buy tax" value={`${Number(security.buyTax ?? 0).toFixed(1)}%`} />
                    <InfoBox label="Sell tax" value={`${Number(security.sellTax ?? 0).toFixed(1)}%`} />
                    <InfoBox label="Holders" value={Number(security.holderCount ?? 0).toLocaleString()} />
                    <InfoBox label="LP holders" value={Number(security.lpHolderCount ?? 0).toLocaleString()} />
                  </div>

                  <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
                    {Array.isArray(security.risks) && security.risks.length > 0 ? (
                      <ul className="space-y-1.5">
                        {security.risks.map((r: string) => (
                          <li key={r} className="flex items-center gap-2 text-sm text-zinc-300">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-bb-down" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-bb-up">No major risks detected.</p>
                    )}
                  </div>

                  {security.owner && (
                    <div className="overflow-hidden rounded-2xl border border-bb-border bg-bb-surface">
                      <DetailRow label="Contract owner" value={shortAddr(String(security.owner))} onCopy={() => void copyText(String(security.owner))} />
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-600">Powered by GoPlus. Not financial advice.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-bb-border bg-bb-bg/95 p-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:p-3">
        <div className="mx-auto max-w-[1500px]">
          {dexUrl ? (
            <a
              href={dexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-bb-up text-base font-bold text-black transition-all duration-150 active:scale-[0.97]"
            >
              <Zap className="h-4 w-4 fill-current" />
              Trade {symbol} on DexScreener
            </a>
          ) : (
            <div className="flex h-12 w-full items-center justify-center rounded-xl border border-bb-border text-sm font-semibold text-zinc-600">
              No pool to trade yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EvmTokenPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bb-bg" />}>
      <EvmTokenInner />
    </Suspense>
  );
}
