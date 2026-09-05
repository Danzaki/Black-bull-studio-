"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  CheckCircle2,
  Loader2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { useWalletSession } from "@/context/WalletSessionContext";
import type { TokenInfo } from "@/types/terminal";

interface SolanaSwapFormProps {
  token: TokenInfo;
  currentPrice: number | null;
}

interface JupiterOrder {
  transaction?: string;
  requestId?: string;
  inputMint?: string;
  outputMint?: string;
  inAmount?: string;
  outAmount?: string;
  priceImpact?: number;
  slippageBps?: number;
  signatureFeeLamports?: number;
  prioritizationFeeLamports?: number;
  errorCode?: number;
  errorMessage?: string;
}

interface JupiterExecuteResponse {
  signature?: string;
  status?: string;
  error?: string;
  code?: number;
}

const SOL_MINT = "So11111111111111111111111111111111111111112";

const QUICK_BUY = [0.1, 0.25, 0.5, 1, 2];

function formatNumber(value: number, maximumFractionDigits = 6) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

function toBaseUnits(value: string, decimals: number) {
  const normalized = value.trim();

  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ""] = normalized.split(".");

  if (fraction.length > decimals) {
    return null;
  }

  const padded = fraction.padEnd(decimals, "0");
  const result = BigInt(whole || "0") * 10n ** BigInt(decimals);

  const fractional =
    padded.length > 0
      ? BigInt(padded) * 10n ** BigInt(decimals - padded.length)
      : 0n;

  const total = result + fractional;

  return total > 0n ? total.toString() : null;
}

function fromBaseUnits(value: string, decimals: number) {
  const amount = BigInt(value);
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .replace(/0+$/, "");

  return `${whole}.${fractionText}`;
}

export default function SolanaSwapForm({
  token,
  currentPrice,
}: SolanaSwapFormProps) {
  const {
    publicKey,
    isUnlocked,
    balanceSol,
    loading: walletLoading,
    getKeypair,
    refreshBalance,
  } = useWalletSession();

  const [mode, setMode] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("0.5");

  const [order, setOrder] = useState<JupiterOrder | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inputMint = mode === "BUY" ? SOL_MINT : token.mint;
  const outputMint = mode === "BUY" ? token.mint : SOL_MINT;

  const inputDecimals = mode === "BUY" ? 9 : token.decimals;
  const outputDecimals = mode === "BUY" ? token.decimals : 9;

  const amountBaseUnits = useMemo(
    () => toBaseUnits(amount, inputDecimals),
    [amount, inputDecimals]
  );

  const estimatedOutput = useMemo(() => {
    if (!order?.outAmount) return null;

    try {
      return fromBaseUnits(order.outAmount, outputDecimals);
    } catch {
      return null;
    }
  }, [order, outputDecimals]);

  function clearQuote() {
    setOrder(null);
    setError("");
    setSuccess("");
  }

  function changeMode(nextMode: "BUY" | "SELL") {
    setMode(nextMode);
    setAmount(nextMode === "BUY" ? "0.5" : "");
    clearQuote();
  }

  async function getQuote() {
    setError("");
    setSuccess("");
    setOrder(null);

    if (!publicKey) {
      setError("Connect or create a wallet first.");
      return;
    }

    if (!isUnlocked) {
      setError("Unlock your wallet before requesting a swap.");
      return;
    }

    if (!amountBaseUnits) {
      setError(
        `Enter a valid ${mode === "BUY" ? "SOL" : token.symbol} amount.`
      );
      return;
    }

    try {
      new PublicKey(publicKey);
    } catch {
      setError("The connected wallet address is invalid.");
      return;
    }

    setQuoteLoading(true);

    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amountBaseUnits,
        taker: publicKey,
      });

      const response = await fetch(
        `/api/terminal/swap/order?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = (await response.json()) as JupiterOrder & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.errorMessage ||
            "Unable to get a swap quote from Jupiter."
        );
      }

      if (data.errorMessage) {
        throw new Error(data.errorMessage);
      }

      if (!data.transaction || !data.requestId) {
        throw new Error("Jupiter returned an incomplete swap order.");
      }

      setOrder(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to get a swap quote."
      );
    } finally {
      setQuoteLoading(false);
    }
  }

  async function executeSwap() {
    setError("");
    setSuccess("");

    if (!order?.transaction || !order.requestId) {
      setError("Request a fresh quote before executing the swap.");
      return;
    }

    if (!isUnlocked) {
      setError("Unlock your wallet before signing.");
      return;
    }

    const keypair = getKeypair();

    if (!keypair) {
      setError("Wallet is locked. Unlock it and try again.");
      return;
    }

    setExecuteLoading(true);

    try {
      const transactionBytes = Uint8Array.from(
        atob(order.transaction),
        (character) => character.charCodeAt(0)
      );

      const transaction = VersionedTransaction.deserialize(
        transactionBytes
      );

      transaction.sign([keypair]);

      const signedTransaction = btoa(
        String.fromCharCode(...transaction.serialize())
      );

      const response = await fetch("/api/terminal/swap/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedTransaction,
          requestId: order.requestId,
        }),
      });

      const data = (await response.json()) as JupiterExecuteResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Jupiter could not execute the swap."
        );
      }

      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.signature) {
        throw new Error(
          "Swap was submitted, but no transaction signature was returned."
        );
      }

      setSuccess(data.signature);
      setOrder(null);
      setAmount("");

      await refreshBalance();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The swap could not be completed."
      );
    } finally {
      setExecuteLoading(false);
    }
  }

  const transactionExplorer = success
    ? `https://solscan.io/tx/${success}`
    : null;

  return (
    <section className="rounded-2xl border border-white/10 bg-black p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-300" />
            <h2 className="text-sm font-semibold text-white">
              Swap
            </h2>
          </div>

          <p className="mt-1 text-xs text-zinc-500">
            Jupiter routing · Solana mainnet
          </p>
        </div>

        <div
          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
            isUnlocked
              ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
              : "border-white/10 bg-white/[0.03] text-zinc-500"
          }`}
        >
          {isUnlocked ? "WALLET UNLOCKED" : "WALLET LOCKED"}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 rounded-xl border border-white/10 bg-zinc-950 p-1">
        {(["BUY", "SELL"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeMode(item)}
            className={`rounded-lg py-2 text-xs font-semibold transition ${
              mode === item
                ? item === "BUY"
                  ? "bg-emerald-400 text-black"
                  : "bg-red-400 text-black"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              You pay
            </span>

            <span className="text-[11px] text-zinc-500">
              {mode === "BUY" ? "SOL" : token.symbol}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                clearQuote();
              }}
              inputMode="decimal"
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-white outline-none placeholder:text-zinc-700"
            />

            <div className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300">
              {mode === "BUY" ? "SOL" : token.symbol}
            </div>
          </div>

          {mode === "BUY" && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto">
              {QUICK_BUY.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmount(value.toString());
                    clearQuote();
                  }}
                  className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] text-zinc-500 transition hover:border-white/20 hover:text-white"
                >
                  {value} SOL
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() =>
              changeMode(mode === "BUY" ? "SELL" : "BUY")
            }
            className="rounded-full border border-white/10 bg-zinc-950 p-2 text-zinc-400 transition hover:border-white/20 hover:text-white"
            aria-label="Switch buy and sell"
          >
            <ArrowDownUp className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              You receive
            </span>

            <span className="text-[11px] text-zinc-500">
              {mode === "BUY" ? token.symbol : "SOL"}
            </span>
          </div>

          <div className="text-2xl font-semibold text-white">
            {estimatedOutput ?? "—"}
          </div>

          {mode === "BUY" && currentPrice !== null ? (
            <p className="mt-1 text-[10px] text-zinc-600">
              Market reference: ${formatNumber(currentPrice, 8)}
            </p>
          ) : null}
        </div>

        {order ? (
          <div className="space-y-2 rounded-xl border border-white/10 bg-zinc-950 p-3">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Price impact</span>
              <span className="text-zinc-300">
                {typeof order.priceImpact === "number"
                  ? `${order.priceImpact.toFixed(2)}%`
                  : "—"}
              </span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Slippage</span>
              <span className="text-zinc-300">
                {typeof order.slippageBps === "number"
                  ? `${(order.slippageBps / 100).toFixed(2)}%`
                  : "—"}
              </span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Priority fee</span>
              <span className="text-zinc-300">
                {typeof order.prioritizationFeeLamports === "number"
                  ? `${(
                      order.prioritizationFeeLamports / 1e9
                    ).toFixed(6)} SOL`
                  : "—"}
              </span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="flex gap-2 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Swap submitted successfully.
            </div>

            {transactionExplorer ? (
              <a
                href={transactionExplorer}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block truncate text-[11px] text-zinc-400 underline decoration-zinc-700 underline-offset-2 hover:text-white"
              >
                View transaction on Solscan
              </a>
            ) : null}
          </div>
        ) : null}

        {!publicKey ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950 p-3 text-xs text-zinc-500">
            Connect or create a Black Bull wallet to trade.
          </div>
        ) : null}

        {publicKey && !isUnlocked ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-200">
            <Lock className="h-4 w-4 shrink-0" />
            Unlock the wallet before signing a transaction.
          </div>
        ) : null}

        {publicKey && balanceSol !== null && mode === "BUY" ? (
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>Available SOL</span>
            <span>{balanceSol.toFixed(6)} SOL</span>
          </div>
        ) : null}

        {!order ? (
          <button
            type="button"
            onClick={getQuote}
            disabled={
              quoteLoading ||
              executeLoading ||
              walletLoading ||
              !publicKey ||
              !isUnlocked ||
              !amountBaseUnits
            }
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              mode === "BUY"
                ? "bg-emerald-400 text-black hover:bg-emerald-300"
                : "bg-red-400 text-black hover:bg-red-300"
            }`}
          >
            {quoteLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Getting Jupiter quote…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Get real quote
              </>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={executeSwap}
              disabled={executeLoading || !isUnlocked}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                mode === "BUY"
                  ? "bg-emerald-400 text-black hover:bg-emerald-300"
                  : "bg-red-400 text-black hover:bg-red-300"
              }`}
            >
              {executeLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing & executing…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Confirm {mode} {token.symbol}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={getQuote}
              disabled={quoteLoading || executeLoading}
              className="w-full rounded-xl border border-white/10 py-2 text-[11px] text-zinc-500 transition hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              {quoteLoading ? "Refreshing…" : "Refresh quote"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
