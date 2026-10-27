"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PublicKey } from "@solana/web3.js";
import { ArrowLeft, Copy, Check, Share2, ClipboardPaste, ShieldAlert, ExternalLink } from "lucide-react";
import { useWalletSession } from "@/context/WalletSessionContext";
import { confirmDialog, notify } from "@/lib/notify";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicKey: string | null;
  initialTab?: "deposit" | "withdraw";
}

const FEE_LAMPORTS = 5000;
const RENT_MIN_LAMPORTS = 890880;

function short(a: string) {
  return a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

function checkAddress(v: string, own: string | null): "empty" | "invalid" | "self" | "ok" {
  const t = v.trim();
  if (!t) return "empty";
  try {
    new PublicKey(t);
  } catch {
    return "invalid";
  }
  if (own && t === own) return "self";
  return "ok";
}

export default function WalletModal({ isOpen, onClose, publicKey, initialTab = "deposit" }: WalletModalProps) {
  const { sendSol, balanceSol, isUnlocked } = useWalletSession();
  const [tab, setTab] = useState<"deposit" | "withdraw">(initialTab);
  const [copied, setCopied] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successSig, setSuccessSig] = useState<string | null>(null);

  if (!isOpen) return null;

  const addrState = checkAddress(recipient, publicKey);
  const amountValid = /^(\d+\.?\d*|\.\d+)$/.test(amount.trim());
  const numeric = amountValid ? parseFloat(amount) : 0;
  const balLamports = balanceSol !== null ? Math.round(balanceSol * 1e9) : null;
  const inLamports = Math.round(numeric * 1e9);
  const remainder = balLamports !== null ? balLamports - inLamports - FEE_LAMPORTS : null;
  const insufficient = inLamports > 0 && remainder !== null && remainder < 0;
  const leavesDust = inLamports > 0 && remainder !== null && remainder > 0 && remainder < RENT_MIN_LAMPORTS;
  const canReview = addrState === "ok" && numeric > 0 && !insufficient && !loading;

  const copyAddress = () => {
    if (!publicKey) return;
    void navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareAddress = async () => {
    if (!publicKey) return;
    if (navigator.share) {
      try { await navigator.share({ text: publicKey }); } catch {}
    } else {
      copyAddress();
    }
  };

  const pasteAddress = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { setRecipient(t.trim()); setError(""); }
    } catch {
      notify("Could not read the clipboard. Paste manually.");
    }
  };

  const fillMax = () => {
    if (balLamports === null) return;
    const max = Math.max(0, balLamports - FEE_LAMPORTS);
    setAmount((max / 1e9).toFixed(9).replace(/0+$/, "").replace(/\.$/, ""));
    setError("");
  };

  const handleSend = async () => {
    setError("");
    setSuccessSig(null);
    if (!isUnlocked) { setError("Wallet is locked. Unlock it first."); return; }
    if (!canReview) return;

    const ok = await confirmDialog({
      title: `Send ${numeric} SOL?`,
      message: `To ${short(recipient.trim())}. Transfers on Solana cannot be reversed.`,
      confirmLabel: "Send",
    });
    if (!ok) return;

    setLoading(true);
    const result = await sendSol(recipient.trim(), numeric);
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
    <div className="fixed inset-0 z-[110] flex flex-col bg-bb-bg text-zinc-100">
      <header className="flex h-14 shrink-0 items-center border-b border-bb-border px-2 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={onClose} aria-label="Back" className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-300 active:bg-bb-raised">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-center text-base font-semibold">{tab === "deposit" ? "Receive" : "Send"}</h2>
        <span className="w-11" />
      </header>

      <div className="mx-4 mt-3 grid grid-cols-2 rounded-xl border border-bb-border bg-bb-raised p-1">
        {(["deposit", "withdraw"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setError(""); setSuccessSig(null); }}
            className={`h-10 rounded-lg text-sm font-semibold transition active:scale-95 ${tab === t ? "bg-bb-accent text-black" : "text-zinc-400"}`}
          >
            {t === "deposit" ? "Receive" : "Send"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
        {tab === "deposit" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This is a Solana address. Only send SOL and Solana tokens here. Other networks will be lost.</span>
            </div>

            <div className="mx-auto w-fit rounded-2xl bg-white p-4">
              {publicKey ? <QRCodeSVG value={publicKey} size={200} level="M" /> : <div className="h-[200px] w-[200px] bb-skeleton" />}
            </div>

            <div className="rounded-xl border border-bb-border bg-bb-surface p-3">
              <p className="text-xs text-zinc-400">Your Solana address</p>
              <p className="mt-1 break-all font-mono text-sm">{publicKey || "Loading wallet..."}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={copyAddress} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-bb-accent text-sm font-semibold text-black transition active:scale-95">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={() => void shareAddress()} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-bb-border bg-bb-raised text-sm font-semibold transition active:scale-95">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="rcv" className="text-sm font-semibold">Receiver</label>
                <button type="button" onClick={() => void pasteAddress()} className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-bb-accent active:opacity-60">
                  <ClipboardPaste className="h-4 w-4" /> Paste
                </button>
              </div>
              <input
                id="rcv"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={recipient}
                onChange={(e) => { setRecipient(e.target.value); setError(""); setSuccessSig(null); }}
                placeholder="Paste Solana wallet address"
                className="h-12 w-full rounded-xl border border-bb-border bg-bb-raised px-3 font-mono text-base text-white outline-none placeholder:text-zinc-500 focus:border-bb-accent"
              />
              <p className={`mt-1.5 min-h-[20px] text-sm ${addrState === "ok" ? "text-bb-up" : "text-bb-down"}`}>
                {addrState === "invalid" ? "This is not a valid Solana address." : addrState === "self" ? "This is your own address." : addrState === "ok" ? "Address looks valid." : ""}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="amt" className="text-sm font-semibold">Amount (SOL)</label>
                <span className="text-sm text-zinc-400 tabular-nums">Balance: {balanceSol !== null ? balanceSol.toFixed(4) : "--"} SOL</span>
              </div>
              <div className="relative">
                <input
                  id="amt"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(""); setSuccessSig(null); }}
                  placeholder="0.00"
                  className="h-14 w-full rounded-xl border border-bb-border bg-bb-raised pl-3 pr-20 text-xl font-semibold tabular-nums text-white outline-none placeholder:text-zinc-500 focus:border-bb-accent"
                />
                <button type="button" onClick={fillMax} className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-lg border border-bb-accent/50 px-3 text-sm font-semibold text-bb-accent active:scale-95">
                  Max
                </button>
              </div>
              {insufficient && <p className="mt-1.5 text-sm text-bb-down">Not enough SOL (network fee included).</p>}
              {leavesDust && <p className="mt-1.5 text-sm text-amber-400">This leaves a very small balance. Consider sending a bit less so the account stays active.</p>}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-bb-border bg-bb-surface px-3 py-3 text-sm">
              <span className="text-zinc-400">Network fee</span>
              <span className="tabular-nums">~0.000005 SOL</span>
            </div>

            {error && <p role="alert" className="rounded-xl border border-bb-down/30 bg-bb-down/10 p-3 text-sm text-bb-down">{error}</p>}

            {successSig && (
              <div className="rounded-xl border border-bb-up/30 bg-bb-up/10 p-3 text-sm text-bb-up">
                Sent.{" "}
                <a href={`https://solscan.io/tx/${successSig}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                  View on Solscan <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canReview}
              className="h-12 w-full rounded-xl bg-bb-accent text-base font-semibold text-black transition active:scale-[0.98] disabled:opacity-40"
            >
              {loading ? "Sending..." : "Review and send"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
