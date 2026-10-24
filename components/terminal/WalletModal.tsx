"use client";

import React, { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, X, Copy, Check, Send } from "lucide-react";
import { useWalletSession } from "@/context/WalletSessionContext";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string | null;
}

export default function WalletModal({ isOpen, onClose, publicKey }: WalletModalProps) {
  const { sendSol, balanceSol, isUnlocked } = useWalletSession();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  const [copied, setCopied] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successSig, setSuccessSig] = useState<string | null>(null);

  if (!isOpen) return null;

  const FEE_LAMPORTS = 5000;
  const RENT_MIN_LAMPORTS = 890880;
  const balLamports = balanceSol !== null ? Math.round(balanceSol * 1e9) : null;
  const inLamports = Math.round((parseFloat(amount) || 0) * 1e9);
  const remainder = balLamports !== null ? balLamports - inLamports - FEE_LAMPORTS : null;
  const insufficient = inLamports > 0 && remainder !== null && remainder < 0;
  const leavesDust = inLamports > 0 && remainder !== null && remainder > 0 && remainder < RENT_MIN_LAMPORTS;
  const fillAll = () => {
    if (balLamports === null) return;
    const max = Math.max(0, balLamports - FEE_LAMPORTS);
    setAmount((max / 1e9).toFixed(9).replace(/0+$/, "").replace(/\.$/, ""));
    setError("");
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !amount) return;

    setError("");
    setSuccessSig(null);

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!isUnlocked) {
      setError("Wallet is locked. Unlock it first.");
      return;
    }

    setLoading(true);
    const result = await sendSol(recipient, numericAmount);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Transaction failed.");
      return;
    }

    setSuccessSig(result.signature || null);
    setRecipient("");
    setAmount("");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-bb-border bg-bb-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-bb-border">
          <h2 className="text-base font-semibold text-white">Wallet</h2>
          <button
            onClick={onClose}
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 my-4 rounded-xl bg-bb-raised p-1 border border-bb-border">
          <button
            onClick={() => { setActiveTab("deposit"); setError(""); setSuccessSig(null); }}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
              activeTab === "deposit"
                ? "bg-bb-accent text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" /> Deposit
          </button>
          <button
            onClick={() => { setActiveTab("withdraw"); setError(""); setSuccessSig(null); }}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
              activeTab === "withdraw"
                ? "bg-bb-accent text-black"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ArrowUpRight className="h-4 w-4" /> Withdraw
          </button>
        </div>

        {activeTab === "deposit" ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-zinc-400">
              Send SOL or SPL Tokens directly to your trading wallet:
            </p>
            <div className="rounded-xl border border-bb-border bg-bb-raised p-3 space-y-2">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Deposit Address
              </span>
              <div className="flex items-center justify-between font-mono text-sm text-bb-accent break-all bg-bb-surface p-3 rounded-lg border border-bb-border">
                <span>{publicKey || "Loading wallet..."}</span>
                <button
                  onClick={copyAddress}
                  className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-bb-accent" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleWithdraw} className="space-y-4 pt-2">
            <p className="text-sm text-zinc-400">
              Balance: <span className="text-white font-semibold tabular-nums">{balanceSol !== null ? `${balanceSol.toFixed(4)} SOL` : "--"}</span>
            </p>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Recipient Solana Address
              </label>
              <input
                type="text"
                placeholder="Paste Phantom/Solflare address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full h-12 rounded-xl border border-bb-border bg-bb-raised px-3 text-base text-white placeholder-zinc-600 focus:border-bb-accent focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                Amount (SOL)
              </label>
              <div className="relative">
<input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-12 rounded-xl border border-bb-border bg-bb-raised pl-3 pr-16 text-base text-white placeholder-zinc-600 focus:border-bb-accent focus:outline-none"
                required
              />
<button type="button" onClick={fillAll} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 rounded-lg bg-bb-accent/20 px-3 text-xs font-semibold text-bb-accent active:scale-95">All</button>
</div>
            </div>

            {insufficient && balLamports !== null && (
              <p className="text-sm text-bb-down">
                Insufficient balance. You have {(balLamports / 1e9).toFixed(6)} SOL (network fee ~0.000005 SOL). Tap All to send the max.
              </p>
            )}
            {leavesDust && (
              <p className="text-sm text-yellow-400">
                Leaving less than 0.00089 SOL in the wallet will fail. Leave more, or tap All to send everything.
              </p>
            )}
            {error && <p className="text-sm text-bb-down">{error}</p>}
            {successSig && (
              <div className="text-sm text-bb-up">
                Sent!{" "}
                <a
                  href={`https://solscan.io/tx/${successSig}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  View on Solscan
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || insufficient || leavesDust}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-bb-accent text-sm font-semibold text-black transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {loading ? "Sending..." : "Confirm Withdrawal"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
