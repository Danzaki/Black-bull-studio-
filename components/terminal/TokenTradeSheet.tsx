"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowDownUp } from "lucide-react";
import { VersionedTransaction } from "@solana/web3.js";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { authedFetch } from "@/lib/authedFetch";
import type { TokenInfo } from "@/types/terminal";

const SOL_MINT = "So11111111111111111111111111111111111111112";

interface TokenTradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenInfo;
  initialMode: "BUY" | "SELL";
}

export default function TokenTradeSheet({ isOpen, onClose, token, initialMode }: TokenTradeSheetProps) {
  const { balanceSol, isUnlocked, publicKey, getKeypair, refreshBalance, unlockWallet } = useWalletSession();
  const { holdings, refresh: refreshHoldings } = useWalletHoldings(isOpen && isUnlocked ? publicKey : null);
  const [mode, setMode] = useState<"BUY" | "SELL">(initialMode);
  const [amount, setAmount] = useState("0.1");
  const [quoteOutput, setQuoteOutput] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [rawOrder, setRawOrder] = useState<{ transaction?: string; requestId?: string } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executeError, setExecuteError] = useState("");
  const [successSig, setSuccessSig] = useState<string | null>(null);

  const [unlockPw, setUnlockPw] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  async function handleUnlock() {
    if (!unlockPw) return;
    setUnlockError("");
    setUnlocking(true);
    const r = await unlockWallet(unlockPw);
    setUnlocking(false);
    if (!r.success) {
      setUnlockError(r.error || "Could not unlock wallet.");
      return;
    }
    setUnlockPw("");
  }

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  const fetchQuote = useCallback(async () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setQuoteOutput(null);
      return;
    }

    setQuoteLoading(true);
    setQuoteError("");

    try {
      const inputMint = mode === "BUY" ? SOL_MINT : token.mint;
      const outputMint = mode === "BUY" ? token.mint : SOL_MINT;
      const inputDecimals = mode === "BUY" ? 9 : token.decimals;
      const amountInSmallestUnit = Math.round(numericAmount * Math.pow(10, inputDecimals));

      if (!publicKey) {
        throw new Error("Wallet address is not available.");
      }

      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: String(amountInSmallestUnit),
        taker: publicKey,
      });

      const res = await authedFetch(`/api/terminal/swap/order?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        throw new Error(
          errorJson?.error || "No route found for this amount"
        );
      }

      const json = await res.json();

      if (json.error || !json.transaction) {
        throw new Error(json.error || "No route found for this amount");
      }

      const outputDecimals = mode === "BUY" ? token.decimals : 9;
      const outAmount = parseInt(json.outAmount, 10) / Math.pow(10, outputDecimals);
      setQuoteOutput(outAmount.toString());
      setRawOrder({ transaction: json.transaction, requestId: json.requestId });
    } catch (err: any) {
      setQuoteError(err.message || "Failed to get quote");
      setQuoteOutput(null);
      setRawOrder(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [amount, mode, token.mint, token.decimals, publicKey]);

  const executeTrade = useCallback(async () => {
    setExecuteError("");
    setSuccessSig(null);

    const keypair = getKeypair();
    if (!keypair) {
      setExecuteError("Wallet is locked. Unlock it first.");
      return;
    }
    if (!rawOrder?.transaction || !rawOrder?.requestId) {
      setExecuteError("Get a fresh quote before trading.");
      return;
    }

    setExecuting(true);
    try {
      const transactionBytes = Uint8Array.from(atob(rawOrder.transaction), (c) => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(transactionBytes);
      transaction.sign([keypair]);
      const signedTransaction = btoa(String.fromCharCode(...transaction.serialize()));

      const response = await authedFetch("/api/terminal/swap/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedTransaction, requestId: rawOrder.requestId }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Jupiter could not execute the swap.");
      }
      if (!data.signature) {
        throw new Error("Swap was submitted, but no signature was returned.");
      }

      setSuccessSig(data.signature);
      setRawOrder(null);
      await refreshBalance();
      void refreshHoldings();
      void fetchQuote();
    } catch (err: any) {
      setExecuteError(err.message || "The trade could not be completed.");
    } finally {
      setExecuting(false);
    }
  }, [getKeypair, rawOrder, refreshBalance, fetchQuote, refreshHoldings]);

    // Share tsohon quote idan adadi ko mode ya canza, kar a aiwatar da shi
  useEffect(() => {
    setRawOrder(null);
    setQuoteOutput(null);
  }, [amount, mode, token.mint]);

  // Sabunta quote duk bayan 20s don kar ya mutu
  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => {
      if (!executing) void fetchQuote();
    }, 20000);
    return () => clearInterval(id);
  }, [isOpen, executing, fetchQuote]);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      void fetchQuote();
    }, 400);
    return () => clearTimeout(timeout);
  }, [isOpen, fetchQuote]);

  const isSmallTrade =
    mode === "BUY"
      ? (balanceSol !== null && balanceSol < 0.01) || parseFloat(amount || "0") * 200 < 5
      : quoteOutput !== null && parseFloat(quoteOutput) * 200 < 5;

  const RESERVE_SOL = 0.003;
  const amt = parseFloat(amount) || 0;
  const maxBuy = balanceSol !== null ? Math.max(0, balanceSol - RESERVE_SOL) : 0;
  const insufficient = mode === "BUY" && isUnlocked && balanceSol !== null && amt > 0 && amt > balanceSol;
  const nearMax = mode === "BUY" && isUnlocked && balanceSol !== null && !insufficient && amt > maxBuy;
  const fillMax = () => {
    setAmount(maxBuy.toFixed(6).replace(/0+$/, "").replace(/\.$/, ""));
  };

  const holding = holdings.find((h) => h.mint === token.mint) ?? null;
  const sellInsufficient = mode === "SELL" && isUnlocked && holding !== null && amt > 0 && amt > holding.balance;
  const fillPct = (p: number) => {
    if (!holding) return;
    const f = Math.pow(10, holding.decimals);
    const v = Math.floor((holding.balance * f * p) / 100) / f;
    let t = v.toFixed(holding.decimals);
    if (t.includes(".")) t = t.replace(/0+$/, "").replace(/\.$/, "");
    setAmount(t);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-bb-surface border-t border-bb-border rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-bb-border">
          <h2 className="text-sm font-bold text-white">Quick Trade — {token.symbol}</h2>
          <button onClick={onClose} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-bb-raised hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-bb-raised p-1 rounded-xl border border-bb-border my-4">
          <button
            onClick={() => setMode("BUY")}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
              mode === "BUY" ? "bg-bb-up text-black" : "text-zinc-400"
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setMode("SELL")}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
              mode === "SELL" ? "bg-bb-down text-black" : "text-zinc-400"
            }`}
          >
            SELL
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
              <span>{mode === "BUY" ? "AMOUNT IN SOL" : `AMOUNT IN ${token.symbol}`}</span>
              {mode === "BUY" && (
                <span>
                  BALANCE: {isUnlocked && balanceSol !== null ? `${balanceSol.toFixed(4)} SOL` : "--"}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-12 bg-bb-raised border border-bb-border rounded-xl pl-3 pr-24 text-base font-semibold tabular-nums text-white focus:outline-none focus:border-bb-accent"
              />
              {mode === "BUY" && (
                <button type="button" onClick={fillMax} disabled={!isUnlocked || balanceSol === null} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 rounded-lg bg-bb-accent/20 px-3 text-xs font-semibold text-bb-accent active:scale-95 disabled:opacity-40">Max</button>
              )}
              <span className={`absolute top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-semibold ${mode === "BUY" ? "right-16" : "right-3"}`}>
                {mode === "BUY" ? "SOL" : token.symbol}
              </span>
            </div>
          </div>

          {mode === "BUY" && (
            <div className="grid grid-cols-4 gap-2">
              {[0.1, 0.3, 0.5, 1].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className={"h-9 rounded-lg border text-sm font-semibold tabular-nums active:scale-95 " + (parseFloat(amount) === v ? "border-bb-accent bg-bb-accent/10 text-bb-accent" : "border-bb-border bg-bb-raised text-zinc-300")}
                >
                  {v}
                </button>
              ))}
            </div>
          )}

          {mode === "SELL" && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>BALANCE</span>
                <span>
                  {isUnlocked && holding ? holding.balance.toLocaleString(undefined, { maximumFractionDigits: 6 }) + " " + token.symbol : "--"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={!isUnlocked || !holding}
                    onClick={() => fillPct(p)}
                    className="h-9 rounded-lg border border-bb-border bg-bb-raised text-sm font-semibold tabular-nums text-zinc-300 active:scale-95 disabled:opacity-40"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center text-zinc-500">
            <ArrowDownUp className="h-4 w-4" />
          </div>

          <div className="p-3.5 bg-bb-raised rounded-xl border border-bb-border text-sm space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>You receive (live Jupiter quote)</span>
              <span className="text-white font-bold">
                {quoteLoading
                  ? "..."
                  : quoteOutput !== null
                  ? `${parseFloat(quoteOutput).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${mode === "BUY" ? token.symbol : "SOL"}`
                  : "--"}
              </span>
            </div>
            {insufficient && balanceSol !== null && (
              <p className="text-bb-down text-xs">Insufficient balance. You have {balanceSol.toFixed(6)} SOL. Tap Max.</p>
            )}
            {nearMax && (
              <p className="text-amber-400 text-xs">Keep about 0.003 SOL for network fees and token account rent, or the swap may fail. Tap Max.</p>
            )}
            {sellInsufficient && holding && (
              <p className="text-bb-down text-xs">Insufficient balance. You have {holding.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })} {token.symbol}.</p>
            )}
            {mode === "SELL" && isUnlocked && !holding && (
              <p className="text-amber-400 text-xs">This token was not found in your wallet.</p>
            )}
            {quoteError && <p className="text-bb-down text-xs">{quoteError}</p>}
            {!quoteLoading && !quoteError && isSmallTrade && (
              <p className="text-amber-400 text-xs pt-1">
                ⚠ Small trade — fee may reach ~10% due to gasless mode. Increase the trade amount or keep more than 0.01 SOL in your wallet for standard fees.
              </p>
            )}
          </div>

          {executeError && <p className="text-center text-sm text-bb-down">{executeError}</p>}
          {successSig && (
            <p className="text-center text-sm text-bb-up">
              Trade sent!{" "}
              <a href={`https://solscan.io/tx/${successSig}`} target="_blank" rel="noopener noreferrer" className="underline">
                View on Solscan
              </a>
            </p>
          )}

          {!isUnlocked && (
          <input
            type="password"
            placeholder="Wallet password"
            value={unlockPw}
            onChange={(e) => setUnlockPw(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleUnlock(); }}
            className="w-full h-12 bg-bb-raised border border-bb-border rounded-xl px-3 text-base text-white focus:outline-none focus:border-bb-accent"
          />
        )}
        {unlockError && <p className="text-center text-sm text-bb-down">{unlockError}</p>}
        <button
            onClick={isUnlocked ? executeTrade : handleUnlock}
            disabled={executing || unlocking || (isUnlocked && (insufficient || sellInsufficient)) || (isUnlocked && !rawOrder) || (!isUnlocked && !unlockPw)}
            className={`w-full h-12 rounded-xl font-bold text-base transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === "BUY" ? "bg-bb-up text-black" : "bg-bb-down text-black"
            }`}
          >
            {executing ? "Processing..." : !isUnlocked ? (unlocking ? "Unlocking..." : "Unlock wallet") : `${mode === "BUY" ? "BUY" : "SELL"} ${token.symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}
