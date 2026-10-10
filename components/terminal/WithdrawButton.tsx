"use client";

import { useState } from "react";
import { authedFetch } from "@/lib/authedFetch";

export default function WithdrawButton({ endpoint, balanceSol }: { endpoint: string; balanceSol: number }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handle() {
    if (busy) return;
    if (!confirm("Withdraw all SOL to your main wallet? This also pauses auto-trading.")) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await authedFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Withdraw failed.");
      setMsg("Done. Sent " + Number(data.amountSol).toFixed(4) + " SOL to your main wallet.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Withdraw failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        onClick={handle}
        disabled={busy || balanceSol <= 0.00002}
        className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Withdrawing..." : "Withdraw all to main wallet"}
      </button>
      {msg && <span className="text-[11px] text-zinc-400">{msg}</span>}
    </span>
  );
}
