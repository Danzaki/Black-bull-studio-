"use client";

import React, { useState, useEffect } from "react";
import { Copy, Check, Wallet, ArrowUpRight, RefreshCw, ArrowDownLeft, Lock } from "lucide-react";
import WalletModal from "./WalletModal";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";

export default function EmbeddedWalletCard() {
  const {
    publicKey,
    hasWallet,
    isUnlocked,
    balanceSol,
    loading,
    checkWallet,
    createWallet,
    unlockWallet,
    refreshBalance,
  } = useWalletSession();

  const { holdings, totalValueUsd, loading: holdingsLoading } = useWalletHoldings(
    isUnlocked ? publicKey : null
  );

  const [copied, setCopied] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void checkWallet();
  }, [checkWallet]);

  useEffect(() => {
    if (publicKey && isUnlocked) {
      void refreshBalance();
    }
  }, [publicKey, isUnlocked, refreshBalance]);

  const copyToClipboard = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const result = await createWallet(password);
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || "Failed to create wallet.");
      return;
    }

    setPassword("");
    setConfirmPassword("");
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    setSubmitting(true);
    const result = await unlockWallet(password);
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || "Failed to unlock wallet.");
      return;
    }

    setPassword("");
  }

  return (
    <>
      <div className="rounded-xl border border-stone-800 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-stone-200">
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold">Trading Wallet</span>
          </div>
          {isUnlocked && (
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 border border-emerald-500/20">
              Unlocked
            </span>
          )}
        </div>

        {loading || hasWallet === null ? (
          <div className="flex items-center justify-center py-3 text-xs text-stone-500 gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Loading wallet...
          </div>
        ) : !hasWallet ? (
          <form onSubmit={handleCreate} className="space-y-3">
            <p className="text-xs text-stone-400">
              Create your trading wallet. This password encrypts your private key — we never see it or store it. If you forget it, your funds cannot be recovered.
            </p>
            <input
              type="password"
              placeholder="Create a password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-800 bg-stone-900 px-3 py-2.5 text-xs text-stone-900 placeholder-stone-600 focus:border-emerald-500 focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-800 bg-stone-900 px-3 py-2.5 text-xs text-stone-900 placeholder-stone-600 focus:border-emerald-500 focus:outline-none"
              required
            />
            {formError && <p className="text-xs text-rose-400">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Creating..." : "Create Trading Wallet"}
            </button>
          </form>
        ) : !isUnlocked ? (
          <form onSubmit={handleUnlock} className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-stone-400 mb-1">
              <Lock className="h-3.5 w-3.5" />
              Enter your password to unlock trading for this session.
            </div>
            <input
              type="password"
              placeholder="Wallet password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-800 bg-stone-900 px-3 py-2.5 text-xs text-stone-900 placeholder-stone-600 focus:border-emerald-500 focus:outline-none"
              required
              autoFocus
            />
            {formError && <p className="text-xs text-rose-400">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Unlocking..." : "Unlock Wallet"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-stone-900/80 px-3 py-2 text-xs font-mono border border-stone-800">
              <span className="text-stone-300">
                {publicKey?.slice(0, 6)}...{publicKey?.slice(-6)}
              </span>
              <button
                onClick={copyToClipboard}
                className="text-stone-400 hover:text-stone-900 transition-colors p-1"
                title="Copy Address"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] text-stone-500">Portfolio Value</div>
              <div className="text-2xl font-black text-stone-900">
                {holdingsLoading ? "..." : `$${(totalValueUsd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div className="text-xs text-stone-500">
                {balanceSol !== null ? `${balanceSol.toFixed(4)} SOL` : "..."}
              </div>
            </div>

            {!holdingsLoading && holdings.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {holdings.map((h) => (
                  <div
                    key={h.mint}
                    className="flex items-center justify-between rounded-lg bg-stone-50 border border-stone-900 px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {h.imageUrl ? (
                        <img src={h.imageUrl} alt={h.symbol} className="h-6 w-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-stone-800 flex items-center justify-center text-[9px] font-bold text-stone-400 shrink-0">
                          {h.symbol[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">{h.symbol}</p>
                        <p className="text-[10px] text-stone-500">
                          {h.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-stone-900 shrink-0">
                      {h.valueUsd !== null ? `$${h.valueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "--"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!holdingsLoading && holdings.length === 0 && (
              <p className="text-[11px] text-stone-600 text-center py-2">No tokens yet.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/20 transition-colors"
              >
                <ArrowDownLeft className="h-3.5 w-3.5" /> Deposit / Transfer
              </button>
              <a
                href={`https://solscan.io/account/${publicKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 border border-stone-800 py-1.5 text-xs font-medium text-stone-300 hover:text-stone-900 hover:bg-stone-800 transition-colors"
              >
                Solscan <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      <WalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        publicKey={publicKey}
      />
    </>
  );
}
