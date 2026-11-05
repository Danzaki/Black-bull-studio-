"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X, Zap } from "lucide-react";
import { getChain } from "@/lib/chains";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Mode = "BUY" | "SELL";

interface Props {
  chainId: "bsc" | "base";
  chainName: string;
  nativeSymbol: string;
  token: { address: string; symbol: string };
  initialMode: Mode;
  onClose: () => void;
}

interface Quote {
  outAmount: string;
  impactPct: number | null;
  gasUsd: number | null;
  feeBps: number;
  balances: { native: number; token: number };
}

const BUY_PRESETS: Record<"bsc" | "base", string[]> = {
  bsc: ["0.05", "0.1", "0.25", "0.5"],
  base: ["0.002", "0.005", "0.01", "0.025"],
};
const SELL_PCTS = [25, 50, 75, 100];
const SLIPPAGES = [50, 100, 300, 1000];

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await getSupabaseClient().auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error("Please sign in.");
  return { Authorization: `Bearer ${t}` };
}

export default function EvmTradeSheet({ chainId, chainName, nativeSymbol, token, initialMode, onClose }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [buyAmt, setBuyAmt] = useState(BUY_PRESETS[chainId][1]);
  const [pct, setPct] = useState(50);
  const [slippage, setSlippage] = useState(100);
  const [oneTap, setOneTap] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ hash: string } | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    try {
      if (localStorage.getItem("bb_one_tap") === "0") setOneTap(false);
    } catch {}
  }, []);

  function toggleOneTap() {
    const next = !oneTap;
    setOneTap(next);
    try {
      localStorage.setItem("bb_one_tap", next ? "1" : "0");
    } catch {}
  }

  const buyValid = /^\d*\.?\d+$/.test(buyAmt) && Number(buyAmt) > 0;
  const valid = mode === "BUY" ? buyValid : pct >= 1 && pct <= 100;

  const fetchQuote = useCallback(async () => {
    if (!valid) {
      setQuote(null);
      return;
    }
    const id = ++reqId.current;
    try {
      const q = new URLSearchParams({
        chain: chainId,
        side: mode,
        token: token.address,
        slippage: String(slippage),
      });
      if (mode === "BUY") q.set("amount", buyAmt);
      else q.set("pct", String(pct));
      const r = await fetch(`/api/evm-swap/quote?${q.toString()}`, { headers: await authHeader(), cache: "no-store" });
      const j = await r.json();
      if (id !== reqId.current) return;
      if (!r.ok) throw new Error(j.error || "Could not get a quote.");
      setQuote(j);
      setQuoteErr("");
    } catch (e) {
      if (id !== reqId.current) return;
      setQuote(null);
      setQuoteErr(e instanceof Error ? e.message : "Could not get a quote.");
    }
  }, [valid, chainId, mode, token.address, slippage, buyAmt, pct]);

  useEffect(() => {
    setQuote(null);
    const t = setTimeout(() => void fetchQuote(), 400);
    const i = setInterval(() => {
      if (!busy) void fetchQuote();
    }, 15000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [fetchQuote, busy]);

  async function execute(over?: { amount?: string; pct?: number }) {
    if (busy) return;
    setBusy(true);
    setError("");
    setDone(null);
    try {
      const body: Record<string, unknown> = {
        chain: chainId,
        side: mode,
        token: token.address,
        slippageBps: slippage,
      };
      if (mode === "BUY") body.amount = over?.amount ?? buyAmt;
      else body.pct = over?.pct ?? pct;
      const r = await fetch("/api/evm-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Swap failed.");
      setDone({ hash: j.hash });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Swap failed.");
    } finally {
      setBusy(false);
      void fetchQuote();
    }
  }

  function pickBuy(a: string) {
    setBuyAmt(a);
    setDone(null);
    setError("");
    if (oneTap) void execute({ amount: a });
  }

  function pickPct(p: number) {
    setPct(p);
    setDone(null);
    setError("");
    if (oneTap) void execute({ pct: p });
  }

  const outSymbol = mode === "BUY" ? token.symbol : nativeSymbol;
  const balanceLine =
    quote === null
      ? "--"
      : mode === "BUY"
      ? `${quote.balances.native.toFixed(4)} ${nativeSymbol}`
      : `${quote.balances.token.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${token.symbol}`;
  const lowBalance = mode === "BUY" && quote !== null && buyValid && quote.balances.native < Number(buyAmt);

  const chip = (active: boolean, color: string) =>
    `h-11 rounded-xl border text-sm font-semibold tabular-nums transition active:scale-95 disabled:opacity-40 ${
      active ? color : "border-bb-border bg-bb-raised text-zinc-300"
    }`;
  const accent = mode === "BUY" ? "border-bb-up bg-bb-up/15 text-bb-up" : "border-bb-down bg-bb-down/15 text-bb-down";

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-bb-border bg-bb-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between border-b border-bb-border pb-3">
          <h2 className="text-sm font-bold text-white">
            Quick Trade — {token.symbol} <span className="font-normal text-zinc-500">on {chainName}</span>
          </h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-4 flex items-center gap-1 rounded-xl border border-bb-border bg-bb-raised p-1">
          <button
            onClick={() => setMode("BUY")}
            className={`h-10 flex-1 rounded-lg text-sm font-semibold ${mode === "BUY" ? "bg-bb-up text-black" : "text-zinc-400"}`}
          >
            BUY
          </button>
          <button
            onClick={() => setMode("SELL")}
            className={`h-10 flex-1 rounded-lg text-sm font-semibold ${mode === "SELL" ? "bg-bb-down text-black" : "text-zinc-400"}`}
          >
            SELL
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
          <span>{mode === "BUY" ? `AMOUNT IN ${nativeSymbol}` : `SELL ${token.symbol}`}</span>
          <span>BALANCE: {balanceLine}</span>
        </div>

        {mode === "BUY" ? (
          <>
            <div className="grid grid-cols-4 gap-2">
              {BUY_PRESETS[chainId].map((a) => (
                <button key={a} disabled={busy} onClick={() => pickBuy(a)} className={chip(buyAmt === a, accent)}>
                  {a}
                </button>
              ))}
            </div>
            <input
              value={buyAmt}
              onChange={(e) => {
                setBuyAmt(e.target.value.trim());
                setDone(null);
              }}
              inputMode="decimal"
              placeholder="Custom amount"
              className="mt-2 h-12 w-full rounded-xl border border-bb-border bg-bb-raised px-3 text-base font-semibold tabular-nums text-white outline-none placeholder:text-zinc-500 focus:border-bb-accent"
            />
          </>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {SELL_PCTS.map((p) => (
              <button key={p} disabled={busy} onClick={() => pickPct(p)} className={chip(pct === p, accent)}>
                {p}%
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Slippage</span>
            {SLIPPAGES.map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`h-8 rounded-lg border px-2 text-xs font-semibold tabular-nums ${
                  slippage === s ? "border-bb-accent bg-bb-accent/15 text-bb-accent" : "border-bb-border bg-bb-raised text-zinc-400"
                }`}
              >
                {s / 100}%
              </button>
            ))}
          </div>
          <button
            onClick={toggleOneTap}
            className={`flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2 text-xs font-semibold ${
              oneTap ? "border-bb-accent bg-bb-accent/15 text-bb-accent" : "border-bb-border bg-bb-raised text-zinc-400"
            }`}
          >
            <Zap className="h-3.5 w-3.5" /> 1-tap {oneTap ? "ON" : "OFF"}
          </button>
        </div>

        <div className="mt-3 space-y-1.5 rounded-xl border border-bb-border bg-bb-raised p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-400">You get</span>
            <span className="font-semibold tabular-nums text-white">
              {quote ? `≈ ${Number(quote.outAmount).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${outSymbol}` : "--"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Price impact</span>
            <span className="tabular-nums text-zinc-200">
              {quote?.impactPct != null ? `${quote.impactPct.toFixed(2)}%` : "--"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Platform fee</span>
            <span className="tabular-nums text-zinc-200">{quote ? `${(quote.feeBps / 100).toFixed(2)}%` : "--"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Network gas</span>
            <span className="tabular-nums text-zinc-200">{quote?.gasUsd != null ? `~$${quote.gasUsd.toFixed(3)}` : "--"}</span>
          </div>
        </div>

        {quoteErr && !busy && <p className="mt-2 text-xs text-bb-down">{quoteErr}</p>}
        {lowBalance && <p className="mt-2 text-xs text-bb-down">Not enough {nativeSymbol} in your wallet.</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-bb-down/30 bg-bb-down/10 p-3 text-sm text-bb-down">
            {error}
          </p>
        )}
        {busy && (
          <p className="mt-3 rounded-xl border border-bb-border bg-bb-raised p-3 text-sm text-zinc-300">
            Processing… this can take up to 30 seconds. Keep this open.
          </p>
        )}
        {done && (
          <div className="mt-3 rounded-xl border border-bb-up/30 bg-bb-up/10 p-3 text-sm text-bb-up">
            Trade confirmed.{" "}
            <a
              href={`${getChain(chainId).explorerUrl}/tx/${done.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              View on explorer <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <button
          onClick={() => void execute()}
          disabled={!valid || busy || lowBalance}
          className={`mt-4 h-12 w-full rounded-xl text-base font-bold text-black transition active:scale-[0.98] disabled:opacity-40 ${
            mode === "BUY" ? "bg-bb-up" : "bg-bb-down"
          }`}
        >
          {busy ? "Processing..." : mode === "BUY" ? `Buy with ${buyAmt || "0"} ${nativeSymbol}` : `Sell ${pct}%`}
        </button>
      </div>
    </div>,
    document.body
  );
}
