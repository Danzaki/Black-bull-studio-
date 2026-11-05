"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X, Zap } from "lucide-react";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { authedFetch } from "@/lib/authedFetch";
import type { TokenInfo } from "@/types/terminal";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const BUY_PRESETS = ["0.05", "0.1", "0.5", "1"];
const SELL_PCTS = [25, 50, 75, 100];
const FEE_BUFFER_SOL = 0.01;

interface TokenTradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenInfo;
  initialMode: "BUY" | "SELL";
}

interface Quote {
  out: number;
  impact: number | null;
}

export default function TokenTradeSheet({ isOpen, onClose, token, initialMode }: TokenTradeSheetProps) {
  const { balanceSol, isUnlocked, publicKey, refreshBalance } = useWalletSession();
  const { holdings, refresh: refreshHoldings } = useWalletHoldings(isOpen && isUnlocked ? publicKey : null);

  const [mode, setMode] = useState<"BUY" | "SELL">(initialMode);
  const [buyAmt, setBuyAmt] = useState(BUY_PRESETS[1]);
  const [pct, setPct] = useState(50);
  const [oneTap, setOneTap] = useState(true);
  const [feeBps, setFeeBps] = useState<number | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteErr, setQuoteErr] = useState("");
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [sig, setSig] = useState<string | null>(null);
  const reqId = useRef(0);

  const holding = holdings.find((h) => h.mint === token.mint) ?? null;

  const pctAmount = useCallback(
    (p: number): string => {
      if (!holding || holding.balance <= 0) return "0";
      const f = Math.pow(10, holding.decimals);
      const v = p === 100 ? Math.floor(holding.balance * f) / f : Math.floor((holding.balance * f * p) / 100) / f;
      let t = v.toFixed(holding.decimals);
      if (t.includes(".")) t = t.replace(/0+$/, "").replace(/\.$/, "");
      return t;
    },
    [holding]
  );

  const amountStr = mode === "BUY" ? buyAmt : pctAmount(pct);
  const amountNum = parseFloat(amountStr);
  const valid = Number.isFinite(amountNum) && amountNum > 0 && /^\d*\.?\d+$/.test(amountStr);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    try {
      if (localStorage.getItem("bb_one_tap") === "0") setOneTap(false);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    fetch("/api/terminal/swap/fee", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j && typeof j.feeBps === "number") setFeeBps(j.feeBps);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isOpen]);

  function toggleOneTap() {
    const next = !oneTap;
    setOneTap(next);
    try {
      localStorage.setItem("bb_one_tap", next ? "1" : "0");
    } catch {}
  }

  const fetchQuote = useCallback(async () => {
    if (!publicKey || !valid) {
      setQuote(null);
      return;
    }
    const id = ++reqId.current;
    try {
      const inputMint = mode === "BUY" ? SOL_MINT : token.mint;
      const outputMint = mode === "BUY" ? token.mint : SOL_MINT;
      const inDec = mode === "BUY" ? 9 : token.decimals;
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: String(Math.round(amountNum * Math.pow(10, inDec))),
        taker: publicKey,
      });
      const res = await authedFetch(`/api/terminal/swap/order?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (id !== reqId.current) return;
      if (!res.ok || !json || json.error || !json.transaction) {
        throw new Error(json?.error || "No route found for this amount");
      }
      const outDec = mode === "BUY" ? token.decimals : 9;
      const out = parseInt(json.outAmount, 10) / Math.pow(10, outDec);
      const impact = typeof json.priceImpact === "number" ? Math.abs(json.priceImpact) : null;
      setQuote({ out, impact });
      setQuoteErr("");
    } catch (e: any) {
      if (id !== reqId.current) return;
      setQuote(null);
      setQuoteErr(e?.message || "Failed to get quote");
    }
  }, [publicKey, valid, mode, token.mint, token.decimals, amountNum]);

  useEffect(() => {
    if (!isOpen) return;
    setQuote(null);
    const t = setTimeout(() => void fetchQuote(), 400);
    const i = setInterval(() => {
      if (!executing) void fetchQuote();
    }, 20000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, [isOpen, fetchQuote, executing]);

  async function execute(over?: string) {
    if (executing) return;
    const amt = over ?? amountStr;
    const n = parseFloat(amt);
    if (!Number.isFinite(n) || n <= 0) return;
    setExecuting(true);
    setError("");
    setSig(null);
    try {
      const response = await authedFetch("/api/wallet/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, mint: token.mint, amount: String(amt) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.error) throw new Error(data?.error || "The trade could not be completed.");
      if (!data.signature) throw new Error("Swap was submitted, but no signature was returned.");
      setSig(data.signature);
      await refreshBalance();
      void refreshHoldings();
    } catch (e: any) {
      setError(e?.message || "The trade could not be completed.");
    } finally {
      setExecuting(false);
      void fetchQuote();
    }
  }

  function pickBuy(a: string) {
    setBuyAmt(a);
    setSig(null);
    setError("");
    if (oneTap) void execute(a);
  }

  function pickPct(p: number) {
    setPct(p);
    setSig(null);
    setError("");
    if (oneTap) void execute(pctAmount(p));
  }

  if (!isOpen) return null;

  const lowBalance =
    mode === "BUY" && isUnlocked && balanceSol !== null && valid && amountNum + FEE_BUFFER_SOL > balanceSol;
  const noHolding = mode === "SELL" && isUnlocked && (!holding || holding.balance <= 0);
  const outSymbol = mode === "BUY" ? token.symbol : "SOL";
  const balanceLine =
    mode === "BUY"
      ? isUnlocked && balanceSol !== null
        ? `${balanceSol.toFixed(4)} SOL`
        : "--"
      : holding
      ? `${holding.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${token.symbol}`
      : `0 ${token.symbol}`;

  const chip = (active: boolean, color: string) =>
    `h-11 rounded-xl border text-sm font-semibold tabular-nums transition active:scale-95 disabled:opacity-40 ${
      active ? color : "border-bb-border bg-bb-raised text-zinc-300"
    }`;
  const accent = mode === "BUY" ? "border-bb-up bg-bb-up/15 text-bb-up" : "border-bb-down bg-bb-down/15 text-bb-down";
  const blocked = executing || !isUnlocked;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border-t border-bb-border bg-bb-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between border-b border-bb-border pb-3">
          <h2 className="text-sm font-bold text-white">
            Quick Trade — {token.symbol} <span className="font-normal text-zinc-500">on Solana</span>
          </h2>
          <button
            onClick={onClose}
            disabled={executing}
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
          <span>{mode === "BUY" ? "AMOUNT IN SOL" : `SELL ${token.symbol}`}</span>
          <span>BALANCE: {balanceLine}</span>
        </div>

        {mode === "BUY" ? (
          <>
            <div className="grid grid-cols-4 gap-2">
              {BUY_PRESETS.map((a) => (
                <button key={a} disabled={blocked} onClick={() => pickBuy(a)} className={chip(buyAmt === a, accent)}>
                  {a}
                </button>
              ))}
            </div>
            <input
              value={buyAmt}
              onChange={(e) => {
                setBuyAmt(e.target.value.trim());
                setSig(null);
              }}
              inputMode="decimal"
              placeholder="Custom amount"
              className="mt-2 h-12 w-full rounded-xl border border-bb-border bg-bb-raised px-3 text-base font-semibold tabular-nums text-white outline-none placeholder:text-zinc-500 focus:border-bb-accent"
            />
          </>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {SELL_PCTS.map((p) => (
              <button
                key={p}
                disabled={blocked || noHolding}
                onClick={() => pickPct(p)}
                className={chip(pct === p, accent)}
              >
                {p}%
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            Slippage
            <span className="rounded-lg border border-bb-border bg-bb-raised px-2 py-1.5 font-semibold text-zinc-300">
              Auto
            </span>
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
              {quote ? `≈ ${quote.out.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${outSymbol}` : "--"}
            </span>
          </div>
          {quote?.impact != null && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Price impact</span>
              <span className="tabular-nums text-zinc-200">{quote.impact.toFixed(2)}%</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-400">Platform fee</span>
            <span className="tabular-nums text-zinc-200">{feeBps === null ? "--" : `${(feeBps / 100).toFixed(2)}%`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Network fee</span>
            <span className="text-zinc-200">Auto</span>
          </div>
        </div>

        {!isUnlocked && <p className="mt-2 text-xs text-zinc-400">Your wallet is still being set up. Try again in a moment.</p>}
        {quoteErr && !executing && <p className="mt-2 text-xs text-bb-down">{quoteErr}</p>}
        {lowBalance && <p className="mt-2 text-xs text-bb-down">Not enough SOL (keep about 0.01 SOL for fees).</p>}
        {noHolding && <p className="mt-2 text-xs text-bb-down">You do not hold {token.symbol} in this wallet.</p>}
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-bb-down/30 bg-bb-down/10 p-3 text-sm text-bb-down">
            {error}
          </p>
        )}
        {executing && (
          <p className="mt-3 rounded-xl border border-bb-border bg-bb-raised p-3 text-sm text-zinc-300">
            Processing… keep this open.
          </p>
        )}
        {sig && (
          <div className="mt-3 rounded-xl border border-bb-up/30 bg-bb-up/10 p-3 text-sm text-bb-up">
            Trade confirmed.{" "}
            <a
              href={`https://solscan.io/tx/${sig}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline"
            >
              View on Solscan <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <button
          onClick={() => void execute()}
          disabled={!valid || blocked || lowBalance || noHolding}
          className={`mt-4 h-12 w-full rounded-xl text-base font-bold text-black transition active:scale-[0.98] disabled:opacity-40 ${
            mode === "BUY" ? "bg-bb-up" : "bg-bb-down"
          }`}
        >
          {executing ? "Processing..." : mode === "BUY" ? `Buy with ${buyAmt || "0"} SOL` : `Sell ${pct}%`}
        </button>
      </div>
    </div>,
    document.body
  );
}
