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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">Wallet Management</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 my-4 rounded-xl bg-zinc-900 p-1 border border-zinc-800">
          <button
            onClick={() => { setActiveTab("deposit"); setError(""); setSuccessSig(null); }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "deposit"
                ? "bg-emerald-500 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" /> Deposit
          </button>
          <button
            onClick={() => { setActiveTab("withdraw"); setError(""); setSuccessSig(null); }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "withdraw"
                ? "bg-emerald-500 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <ArrowUpRight className="h-4 w-4" /> Withdraw
          </button>
        </div>

        {activeTab === "deposit" ? (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-zinc-400">
              Send SOL or SPL Tokens directly to your trading wallet:
            </p>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                Deposit Address
              </span>
              <div className="flex items-center justify-between font-mono text-xs text-emerald-400 break-all bg-black/40 p-2.5 rounded-lg border border-zinc-800/80">
                <span>{publicKey || "Loading wallet..."}</span>
                <button
                  onClick={copyAddress}
                  className="ml-2 text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleWithdraw} className="space-y-4 pt-2">
            <p className="text-[11px] text-zinc-500">
              Balance: <span className="text-white font-bold">{balanceSol !== null ? `${balanceSol.toFixed(4)} SOL` : "--"}</span>
            </p>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Recipient Solana Address
              </label>
              <input
                type="text"
                placeholder="Paste Phantom/Solflare address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Amount (SOL)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}
            {successSig && (
              <div className="text-xs text-emerald-400">
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
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
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
