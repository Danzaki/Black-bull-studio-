"use client";

import { useState } from "react";
import { X, Bell } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

interface SetAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  mint: string;
  poolAddress: string | null;
  symbol: string;
  currentPrice: number | null;
}

function formatPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  if (p <= 0) return "$0";
  const zeros = Math.floor(-Math.log10(p)) - 1;
  if (zeros >= 4) {
    const digits = Math.round(p * Math.pow(10, zeros + 4)).toString().slice(0, 4);
    const sub = String(zeros).split("").map((d) => "\u2080\u2081\u2082\u2083\u2084\u2085\u2086\u2087\u2088\u2089"[Number(d)]).join("");
    return `$0.0${sub}${digits}`;
  }
  return `$${p.toFixed(6)}`;
}

export default function SetAlertModal({ isOpen, onClose, mint, poolAddress, symbol, currentPrice }: SetAlertModalProps) {
  const { createAlert } = useNotifications();
  const [targetPrice, setTargetPrice] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!poolAddress) {
      setError("This token doesn't support price alerts yet.");
      return;
    }

    const price = parseFloat(targetPrice);
    if (!price || price <= 0) {
      setError("Enter a valid target price.");
      return;
    }

    setSubmitting(true);
    setError("");

    const result = await createAlert({ mint, poolAddress, symbol, targetPrice: price, direction });

    setSubmitting(false);

    if (!result.success) {
      setError(result.error || "Failed to create alert.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setTargetPrice("");
      onClose();
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-bb-surface border-t sm:border border-bb-border rounded-t-2xl sm:rounded-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between pb-3 border-b border-bb-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-bb-accent" />
            <h2 className="text-base font-semibold text-white">Price alert — {symbol}</h2>
          </div>
          <button onClick={onClose} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-4">
          {currentPrice !== null && (
            <p className="text-sm text-zinc-400">Current price: <span className="tabular-nums text-white">{formatPrice(currentPrice)}</span></p>
          )}

          <div className="flex items-center gap-1 bg-bb-raised p-1 rounded-xl border border-bb-border">
            <button
              type="button"
              onClick={() => setDirection("above")}
              className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                direction === "above" ? "bg-bb-up text-black" : "text-zinc-400"
              }`}
            >
              Goes Above
            </button>
            <button
              type="button"
              onClick={() => setDirection("below")}
              className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                direction === "below" ? "bg-bb-down text-black" : "text-zinc-400"
              }`}
            >
              Goes Below
            </button>
          </div>

          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">Target Price (USD)</label>
            <input
              type="text"
              inputMode="decimal"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
              className="w-full h-12 bg-bb-raised border border-bb-border rounded-xl px-3 text-base font-semibold tabular-nums text-white focus:outline-none focus:border-bb-accent"
            />
          </div>

          {error && <p className="text-sm text-bb-down">{error}</p>}
          {success && <p className="text-sm text-bb-up">Alert created!</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl font-semibold text-base bg-bb-accent text-black transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Alert"}
          </button>
        </form>
      </div>
    </div>
  );
}
