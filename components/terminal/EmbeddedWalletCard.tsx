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

    if (password.length < 10) {
      setFormError("Password must be at least 10 characters.");
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
      <div className="rounded-2xl border border-bb-border bg-bb-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-zinc-200">
            <Wallet className="h-4 w-4 text-bb-accent" />
            <span className="text-sm font-semibold">Trading Wallet</span>
          </div>
          {isUnlocked && (
            <span className="inline-flex items-center rounded-full bg-bb-up/10 px-2.5 py-1 text-xs font-medium text-bb-up border border-bb-up/20">
              Unlocked
            </span>
          )}
        </div>

        {loading || hasWallet === null ? (
          <div className="flex items-center justify-center py-3 text-sm text-zinc-500 gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Loading wallet...
          </div>
        ) : !hasWallet ? (
          <form onSubmit={handleCreate} className="space-y-3">
            <p className="text-sm leading-relaxed text-zinc-400">
              Create your trading wallet. This password encrypts your private key — we never see it or store it. If you forget it, your funds cannot be recovered.
            </p>
            <input
              type="password"
              placeholder="Create a password (min 10 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 rounded-xl border border-bb-border bg-bb-raised px-3 text-base text-white placeholder-zinc-600 focus:border-bb-accent focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 rounded-xl border border-bb-border bg-bb-raised px-3 text-base text-white placeholder-zinc-600 focus:border-bb-accent focus:outline-none"
              required
            />
            {formError && <p className="text-sm text-bb-down">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-bb-accent text-sm font-semibold text-black transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Trading Wallet"}
            </button>
          </form>
        ) : !isUnlocked ? (
          <form onSubmit={handleUnlock} className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
              <Lock className="h-3.5 w-3.5" />
              Enter your password to unlock trading for this session.
            </div>
            <input
              type="password"
              placeholder="Wallet password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 rounded-xl border border-bb-border bg-bb-raised px-3 text-base text-white placeholder-zinc-600 focus:border-bb-accent focus:outline-none"
              required
              autoFocus
            />
            {formError && <p className="text-sm text-bb-down">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-bb-accent text-sm font-semibold text-black transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Unlocking..." : "Unlock Wallet"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-bb-raised px-3 py-2 text-sm font-mono border border-bb-border">
              <span className="text-zinc-300">
                {publicKey?.slice(0, 6)}...{publicKey?.slice(-6)}
              </span>
              <button
                onClick={copyToClipboard}
                className="flex h-10 w-10 items-center justify-center -mr-2 text-zinc-400 hover:text-white transition-colors"
                title="Copy Address"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-bb-accent" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-zinc-400">Portfolio Value</div>
              <div className="text-3xl font-bold tabular-nums text-white">
                {holdingsLoading ? "..." : `$${(totalValueUsd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </div>
              <div className="text-sm text-zinc-400">
                {balanceSol !== null ? `${balanceSol.toFixed(4)} SOL` : "..."}
              </div>
            </div>

            {!holdingsLoading && holdings.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {holdings.map((h) => (
                  <div
                    key={h.mint}
                    className="flex items-center justify-between rounded-xl bg-bb-raised border border-bb-border px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {h.imageUrl ? (
                        <img src={h.imageUrl} alt={h.symbol} className="h-8 w-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-bb-surface flex items-center justify-center text-xs font-bold text-zinc-400 shrink-0">
                          {h.symbol[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{h.symbol}</p>
                        <p className="text-xs text-zinc-500">
                          {h.balance.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-white shrink-0">
                      {h.valueUsd !== null ? `$${h.valueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "--"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!holdingsLoading && holdings.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-2">No tokens yet.</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-bb-accent text-sm font-semibold text-black transition-all active:scale-[0.97]"
              >
                <ArrowDownLeft className="h-3.5 w-3.5" /> Deposit / Transfer
              </button>
              <a
                href={`https://solscan.io/account/${publicKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-bb-raised border border-bb-border text-sm font-semibold text-zinc-200 transition-all active:scale-[0.97]"
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
