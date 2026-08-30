"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ArrowDownUp } from "lucide-react";
import { useWalletSession } from "@/context/WalletSessionContext";
import type { TokenInfo } from "@/types/terminal";

const SOL_MINT = "So11111111111111111111111111111111111111112";

interface TokenTradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenInfo;
  initialMode: "BUY" | "SELL";
}

export default function TokenTradeSheet({ isOpen, onClose, token, initialMode }: TokenTradeSheetProps) {
  const { balanceSol, isUnlocked } = useWalletSession();
  const [mode, setMode] = useState<"BUY" | "SELL">(initialMode);
  const [amount, setAmount] = useState("0.1");
  const [quoteOutput, setQuoteOutput] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");

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
      const amountInSmallestUnit = Math.floor(numericAmount * Math.pow(10, inputDecimals));

      const res = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInSmallestUnit}&slippageBps=100`
      );

      if (!res.ok) throw new Error("No route found for this amount");
      const json = await res.json();

      const outputDecimals = mode === "BUY" ? token.decimals : 9;
      const outAmount = parseInt(json.outAmount, 10) / Math.pow(10, outputDecimals);
      setQuoteOutput(outAmount.toString());
    } catch (err: any) {
      setQuoteError(err.message || "Failed to get quote");
      setQuoteOutput(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [amount, mode, token.mint, token.decimals]);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = setTimeout(() => {
      void fetchQuote();
    }, 400);
    return () => clearTimeout(timeout);
  }, [isOpen, fetchQuote]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-4 font-mono max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <h2 className="text-sm font-bold text-white">Quick Trade — {token.symbol}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 my-4">
          <button
            onClick={() => setMode("BUY")}
            className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
              mode === "BUY" ? "bg-emerald-500 text-black" : "text-zinc-400"
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setMode("SELL")}
            className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
              mode === "SELL" ? "bg-rose-500 text-black" : "text-zinc-400"
            }`}
          >
            SELL
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
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
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-3 top-3 text-xs text-zinc-400 font-bold">
                {mode === "BUY" ? "SOL" : token.symbol}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center text-zinc-600">
            <ArrowDownUp className="h-4 w-4" />
          </div>

          <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-900 text-xs space-y-1">
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
            {quoteError && <p className="text-rose-400 text-[10px]">{quoteError}</p>}
          </div>

          <button
            disabled
            className="w-full py-3 rounded-lg font-black text-xs tracking-wider bg-zinc-800 text-zinc-500 cursor-not-allowed"
            title="Swap execution is coming soon"
          >
            {mode === "BUY" ? `BUY ${token.symbol}` : `SELL ${token.symbol}`} — Coming Soon
          </button>
          <p className="text-center text-[10px] text-zinc-600">
            Live pricing is real. Trade execution is being finalized for your safety and will be enabled soon.
          </p>
        </div>
      </div>
    </div>
  );
}
