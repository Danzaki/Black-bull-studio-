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
      <div className="w-full max-w-sm bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-2xl p-4 font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Set Price Alert — {symbol}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-4">
          {currentPrice !== null && (
            <p className="text-xs text-zinc-500">Current price: ${currentPrice.toFixed(6)}</p>
          )}

          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => setDirection("above")}
              className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                direction === "above" ? "bg-emerald-500 text-black" : "text-zinc-400"
              }`}
            >
              Goes Above
            </button>
            <button
              type="button"
              onClick={() => setDirection("below")}
              className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                direction === "below" ? "bg-rose-500 text-black" : "text-zinc-400"
              }`}
            >
              Goes Below
            </button>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 block">Target Price (USD)</label>
            <input
              type="text"
              inputMode="decimal"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">Alert created!</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-black text-xs bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Create Alert"}
          </button>
        </form>
      </div>
    </div>
  );
}
