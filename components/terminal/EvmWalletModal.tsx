"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { isAddress } from "viem";
import { ArrowLeft, Check, ClipboardPaste, Copy, ExternalLink, Share2, ShieldAlert } from "lucide-react";
import { getChain } from "@/lib/chains";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { confirmDialog, notify } from "@/lib/notify";

interface Holding {
  address: string;
  symbol: string;
  balance: number;
}

interface Props {
  tab: "deposit" | "withdraw";
  onClose: () => void;
  chainId: "bsc" | "base";
  chainName: string;
  symbol: string;
  address: string;
  nativeBalance: number | null;
  holdings: Holding[];
}

const RESERVE: Record<string, number> = { bsc: 0.003, base: 0.0005 };

function short(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function checkAddress(v: string, own: string): "empty" | "invalid" | "self" | "ok" {
  const t = v.trim();
  if (!t) return "empty";
  if (!isAddress(t)) return "invalid";
  if (t.toLowerCase() === own.toLowerCase()) return "self";
  return "ok";
}

export default function EvmWalletModal({
  tab,
  onClose,
  chainId,
  chainName,
  symbol,
  address,
  nativeBalance,
  holdings,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState("native");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isMax, setIsMax] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hash, setHash] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (token === "native") return { symbol, balance: nativeBalance ?? 0 };
    const h = holdings.find((x) => x.address === token);
    return { symbol: h?.symbol ?? "?", balance: h?.balance ?? 0 };
  }, [token, symbol, nativeBalance, holdings]);

  const addrState = checkAddress(recipient, address);
  const amountValid = isMax || /^(\d+\.?\d*|\.\d+)$/.test(amount.trim());
  const numeric = isMax ? selected.balance : amountValid ? parseFloat(amount) : 0;
  const insufficient = !isMax && numeric > selected.balance;
  const canReview = addrState === "ok" && amountValid && numeric > 0 && !insufficient && !loading;

  const copyAddress = () => {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareAddress = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: address });
      } catch {}
    } else {
      copyAddress();
    }
  };

  const pasteAddress = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) {
        setRecipient(t.trim());
        setError("");
      }
    } catch {
      notify("Could not read the clipboard. Paste manually.");
    }
  };

  const fillMax = () => {
    const max = token === "native" ? Math.max(0, selected.balance - (RESERVE[chainId] ?? 0)) : selected.balance;
    setAmount(max.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 8 }));
    setIsMax(true);
    setError("");
  };

  const handleSend = async () => {
    setError("");
    setHash(null);
    if (!canReview) return;

    const ok = await confirmDialog({
      title: `Send ${isMax ? "max " : ""}${amount} ${selected.symbol}?`,
      message: `To ${short(recipient.trim())} on ${chainName}. Transfers cannot be reversed.`,
      confirmLabel: "Send",
    });
    if (!ok) return;

    setLoading(true);
    try {
      const { data: s } = await getSupabaseClient().auth.getSession();
      const t = s.session?.access_token;
      if (!t) throw new Error("Please sign in.");
      const r = await fetch("/api/evm-wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ chain: chainId, to: recipient.trim(), amount: isMax ? "max" : amount.trim(), token }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Transaction failed.");
      setHash(j.hash);
      setRecipient("");
      setAmount("");
      setIsMax(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex flex-col bg-bb-bg text-zinc-100">
      <header className="flex h-14 shrink-0 items-center border-b border-bb-border px-2 pt-[env(safe-area-inset-top)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-300 active:bg-bb-raised"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="flex-1 text-center text-base font-semibold">{tab === "deposit" ? "Receive" : "Send"}</h2>
        <span className="w-11" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
        {tab === "deposit" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Send only {symbol} and tokens on {chainName}. This address also exists on BNB Chain and Base, so a
                transfer on the wrong network can be lost.
              </span>
            </div>

            <div className="mx-auto w-fit rounded-2xl bg-white p-4">
              <QRCodeSVG value={address} size={200} level="M" />
            </div>

            <div className="rounded-2xl border border-bb-border bg-bb-surface p-3">
              <p className="text-xs text-zinc-400">Your {chainName} address</p>
              <p className="mt-1 break-all font-mono text-sm">{address}</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={copyAddress}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-bb-accent text-sm font-semibold text-black transition active:scale-95"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => void shareAddress()}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-bb-border bg-bb-raised text-sm font-semibold transition active:scale-95"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label htmlFor="evm-token" className="mb-2 block text-sm font-semibold">
                Token
              </label>
              <select
                id="evm-token"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setAmount("");
                  setIsMax(false);
                  setError("");
                }}
                className="h-12 w-full rounded-xl border border-bb-border bg-bb-raised px-3 text-base text-white outline-none focus:border-bb-accent"
              >
                <option value="native">{symbol} (native)</option>
                {holdings.map((h) => (
                  <option key={h.address} value={h.address}>
                    {h.symbol}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="rcv" className="text-sm font-semibold">
                  Receiver
                </label>
                <button
                  type="button"
                  onClick={() => void pasteAddress()}
                  className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-bb-accent active:opacity-60"
                >
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
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setError("");
                  setHash(null);
                }}
                placeholder={`Paste ${chainName} wallet address`}
                className="h-12 w-full rounded-xl border border-bb-border bg-bb-raised px-3 font-mono text-base text-white outline-none placeholder:text-zinc-500 focus:border-bb-accent"
              />
              <p className={`mt-1.5 min-h-[20px] text-sm ${addrState === "ok" ? "text-bb-up" : "text-bb-down"}`}>
                {addrState === "invalid"
                  ? "This is not a valid EVM address."
                  : addrState === "self"
                  ? "This is your own address."
                  : addrState === "ok"
                  ? "Address looks valid."
                  : ""}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="amt" className="text-sm font-semibold">
                  Amount ({selected.symbol})
                </label>
                <span className="text-sm tabular-nums text-zinc-400">
                  Balance: {selected.balance.toLocaleString("en-US", { maximumFractionDigits: 6 })} {selected.symbol}
                </span>
              </div>
              <div className="relative">
                <input
                  id="amt"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setIsMax(false);
                    setError("");
                    setHash(null);
                  }}
                  placeholder="0.00"
                  className="h-14 w-full rounded-xl border border-bb-border bg-bb-raised pl-3 pr-20 text-xl font-semibold tabular-nums text-white outline-none placeholder:text-zinc-500 focus:border-bb-accent"
                />
                <button
                  type="button"
                  onClick={fillMax}
                  className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-lg border border-bb-accent/50 px-3 text-sm font-semibold text-bb-accent active:scale-95"
                >
                  Max
                </button>
              </div>
              {insufficient && <p className="mt-1.5 text-sm text-bb-down">Not enough {selected.symbol}.</p>}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-bb-border bg-bb-surface px-3 py-3 text-sm">
              <span className="text-zinc-400">Network fee</span>
              <span className="tabular-nums">Paid in {symbol}</span>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-bb-down/30 bg-bb-down/10 p-3 text-sm text-bb-down">
                {error}
              </p>
            )}

            {hash && (
              <div className="rounded-xl border border-bb-up/30 bg-bb-up/10 p-3 text-sm text-bb-up">
                Sent.{" "}
                <a
                  href={`${getChain(chainId).explorerUrl}/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline"
                >
                  View on explorer <ExternalLink className="h-3.5 w-3.5" />
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
    </div>,
    document.body
  );
}
