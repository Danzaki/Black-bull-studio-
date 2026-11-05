"use client";

import { useMemo, useState } from "react";
import { isAddress } from "viem";
import { Check, ExternalLink, X } from "lucide-react";
import { getChain } from "@/lib/chains";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface Holding {
  address: string;
  symbol: string;
  balance: number;
}

interface Props {
  chainId: "bsc" | "base";
  chainName: string;
  symbol: string;
  nativeBalance: number | null;
  holdings: Holding[];
  ownAddress: string;
  onClose: () => void;
}

const RESERVE: Record<string, number> = { bsc: 0.003, base: 0.0005 };

function short(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}

export default function EvmSendModal({
  chainId,
  chainName,
  symbol,
  nativeBalance,
  holdings,
  ownAddress,
  onClose,
}: Props) {
  const [token, setToken] = useState("native");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [isMax, setIsMax] = useState(false);
  const [step, setStep] = useState<"form" | "confirm" | "done">("form");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hash, setHash] = useState("");

  const selected = useMemo(() => {
    if (token === "native") return { symbol, balance: nativeBalance ?? 0 };
    const h = holdings.find((x) => x.address === token);
    return { symbol: h?.symbol ?? "?", balance: h?.balance ?? 0 };
  }, [token, symbol, nativeBalance, holdings]);

  const target = to.trim();
  const addrOk = isAddress(target) && target.toLowerCase() !== ownAddress.toLowerCase();
  const num = Number(amount);
  const amountOk = isMax || (/^\d*\.?\d+$/.test(amount) && num > 0 && num <= selected.balance);
  const canContinue = addrOk && amountOk;

  function setMax() {
    const max = token === "native" ? Math.max(0, selected.balance - (RESERVE[chainId] ?? 0)) : selected.balance;
    setAmount(max.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 8 }));
    setIsMax(true);
  }

  async function send() {
    setBusy(true);
    setError("");
    try {
      const { data: s } = await getSupabaseClient().auth.getSession();
      const t = s.session?.access_token;
      if (!t) throw new Error("Please sign in.");
      const r = await fetch("/api/evm-wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ chain: chainId, to: target, amount: isMax ? "max" : amount, token }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Transfer failed.");
      setHash(j.hash);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed.");
      setStep("form");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-bb-border bg-bb-raised px-3 py-2.5 text-base text-white placeholder:text-zinc-600 outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-bb-border bg-bb-surface p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Send on {chainName}</h3>
          <button type="button" onClick={onClose} className="text-zinc-400" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "form" && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Token</label>
              <select
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setAmount("");
                  setIsMax(false);
                }}
                className={input}
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
              <label className="mb-1 block text-xs text-zinc-500">Recipient address</label>
              <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." className={input + " font-mono"} />
              {target && !addrOk && (
                <p className="mt-1 text-xs text-bb-down">
                  {isAddress(target) ? "You cannot send to your own address." : "Invalid address."}
                </p>
              )}
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                <label>Amount</label>
                <span className="tabular-nums">
                  Balance {selected.balance.toLocaleString("en-US", { maximumFractionDigits: 6 })} {selected.symbol}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.trim());
                    setIsMax(false);
                  }}
                  inputMode="decimal"
                  placeholder="0.0"
                  className={input}
                />
                <button type="button" onClick={setMax} className="rounded-lg border border-bb-border bg-bb-raised px-3 text-xs font-semibold text-bb-accent">
                  Max
                </button>
              </div>
              {amount && !amountOk && <p className="mt-1 text-xs text-bb-down">Enter an amount within your balance.</p>}
            </div>
            {error && <p className="text-xs text-bb-down">{error}</p>}
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => {
                setChecked(false);
                setStep("confirm");
              }}
              className="h-11 w-full rounded-xl bg-bb-accent text-sm font-bold text-black disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-3">
            <div className="space-y-2 rounded-xl border border-bb-border bg-bb-raised p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Send</span>
                <span className="font-semibold tabular-nums text-white">
                  {isMax ? "Max " : ""}
                  {amount} {selected.symbol}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">To</span>
                <span className="font-mono text-xs text-white">{short(target)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Network</span>
                <span className="text-white">{chainName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Network fee</span>
                <span className="text-white">Paid in {symbol}</span>
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-amber-300">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5" />
              I checked the address and the network. Transfers cannot be reversed.
            </label>
            {error && <p className="text-xs text-bb-down">{error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep("form")} className="h-11 flex-1 rounded-xl border border-bb-border bg-bb-raised text-sm font-semibold text-zinc-200">
                Back
              </button>
              <button
                type="button"
                disabled={!checked || busy}
                onClick={() => void send()}
                className="h-11 flex-1 rounded-xl bg-bb-accent text-sm font-bold text-black disabled:opacity-40"
              >
                {busy ? "Sending..." : "Confirm send"}
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bb-up/15">
              <Check className="h-6 w-6 text-bb-up" />
            </div>
            <p className="text-sm font-semibold text-white">Transfer submitted</p>
            <a
              href={`${getChain(chainId).explorerUrl}/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-bb-accent underline"
            >
              View on explorer <ExternalLink className="h-3 w-3" />
            </a>
            <button type="button" onClick={onClose} className="h-11 w-full rounded-xl bg-bb-raised text-sm font-semibold text-white">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
