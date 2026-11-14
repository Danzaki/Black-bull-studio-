"use client";

import { useState } from "react";
import { Download, Gift, Check, Lock } from "lucide-react";
import { useWalletSession } from "@/context/WalletSessionContext";
import { useWalletHoldings } from "@/hooks/useWalletHoldings";
import { useEffect } from "react";
import WalletModal from "./WalletModal";
import { useChain } from "@/lib/chains/ChainContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import EvmWalletModal from "./EvmWalletModal";

function formatUsd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function SolanaSnapshot() {
  const { publicKey, isUnlocked, balanceSol, balanceFailed, refreshBalance } = useWalletSession();
  const { totalValueUsd } = useWalletHoldings(isUnlocked ? publicKey : null);

  const [depositOpen, setDepositOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyInviteLink() {
    if (!publicKey) return;
    const link = `${window.location.origin}/invite/${publicKey}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [solPrice, setSolPrice] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112")
      .then((r) => r.json())
      .then((j) => {
        const p = j?.["So11111111111111111111111111111111111111112"]?.usdPrice;
        if (alive && typeof p === "number") setSolPrice(p);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const solValue = balanceSol !== null && solPrice !== null ? balanceSol * solPrice : 0;
  const grandTotal = (totalValueUsd ?? 0) + solValue;
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (balanceSol !== null) { setTimedOut(false); return; }
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [balanceSol, publicKey]);
  const unavailable = isUnlocked && balanceSol === null && (balanceFailed || timedOut);
  const loadingValue = isUnlocked && balanceSol === null && !unavailable;

  return (
    <section className="rounded-xl border border-bb-border bg-bb-surface px-3 py-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Portfolio value</p>
        
      </div>

      {loadingValue ? (
        <div className="bb-skeleton mt-1 h-8 w-36" />
      ) : unavailable ? (
        <div className="mt-1 flex items-center gap-3">
          <p className="text-lg font-semibold text-zinc-400">Balance unavailable</p>
          <button
            type="button"
            onClick={() => { setTimedOut(false); void refreshBalance(); }}
            className="rounded-full border border-bb-border px-3 py-1 text-xs font-semibold text-zinc-200 active:scale-95"
          >
            Retry
          </button>
        </div>
      ) : (
        <p className="text-2xl font-bold leading-tight tabular-nums tracking-tight text-white">
          {isUnlocked ? formatUsd(grandTotal) : "$--"}
        </p>
      )}

      {isUnlocked && balanceSol !== null && (
        <p className="text-[11px] tabular-nums text-zinc-500">
          {balanceSol.toFixed(4)} SOL
        </p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setDepositOpen(true)}
          disabled={!isUnlocked}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-bb-accent text-[12px] font-semibold text-black transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
        >
          <Download className="h-4 w-4" /> Receive
        </button>
        <button
          type="button"
          onClick={copyInviteLink}
          disabled={!isUnlocked}
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-bb-border bg-bb-raised text-[12px] font-semibold text-zinc-200 transition-all duration-150 active:scale-[0.97] disabled:opacity-40"
        >
          {copied ? <Check className="h-4 w-4 text-bb-accent" /> : <Gift className="h-4 w-4" />}
          {copied ? "Copied" : "Invite"}
        </button>
      </div>

      <WalletModal isOpen={depositOpen} onClose={() => setDepositOpen(false)} publicKey={publicKey} />
    </section>
  );
}


const NATIVE: Record<string, string> = { bsc: "BNB", base: "ETH" };

function EvmSnapshot() {
  const { chain } = useChain();
  const [address, setAddress] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<any | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await getSupabaseClient().auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("no session");
        const r = await fetch("/api/evm-wallet", { headers: { Authorization: "Bearer " + token }, cache: "no-store" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "wallet");
        if (alive) setAddress(j.address);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!address) return;
    let alive = true;
    setHoldings(null);
    const load = () =>
      fetch("/api/chain/wallet-holdings?chain=" + chain.id + "&wallet=" + address, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (alive && j) setHoldings(j); })
        .catch(() => {});
    void load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [address, chain.id]);

  const symbol = NATIVE[chain.id] ?? "";
  const native: number | null = holdings?.native?.balance ?? null;

  return (
    <section className="rounded-xl border border-bb-border bg-bb-surface px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Portfolio value · {chain.name}</p>
      {failed ? (
        <p className="mt-1 text-sm text-zinc-400">Wallet unavailable. Sign in again.</p>
      ) : !holdings ? (
        <div className="bb-skeleton mt-1 h-8 w-36" />
      ) : (
        <p className="text-2xl font-bold leading-tight tabular-nums tracking-tight text-white">
          {formatUsd(holdings.totalValueUsd ?? 0)}
        </p>
      )}
      {native !== null && (
        <p className="text-[11px] tabular-nums text-zinc-500">{native.toFixed(4)} {symbol}</p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!address}
        className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-bb-accent text-[12px] font-semibold text-black active:scale-[0.97] disabled:opacity-40"
      >
        <Download className="h-4 w-4" /> Receive
      </button>
      {open && address && (
        <EvmWalletModal
          tab="deposit"
          onClose={() => setOpen(false)}
          chainId={chain.id as "bsc" | "base"}
          chainName={chain.name}
          symbol={symbol}
          address={address}
          nativeBalance={native}
          holdings={holdings?.holdings ?? []}
        />
      )}
    </section>
  );
}

export default function WalletSnapshotHeader() {
  const { chainId } = useChain();
  return chainId === "solana" ? <SolanaSnapshot /> : <EvmSnapshot />;
}
