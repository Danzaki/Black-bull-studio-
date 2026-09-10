"use client";

import React from "react";
import { ArrowUpRight, Copy, ExternalLink, X } from "lucide-react";

interface WalletSummaryModalProps {
  walletAddress: string;
  onClose: () => void;
  onViewWalletDetail: (wallet: string) => void;
}

export default function WalletSummaryModal({
  walletAddress,
  onClose,
  onViewWalletDetail,
}: WalletSummaryModalProps) {
  const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#12131a] p-5 text-zinc-100 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close wallet summary"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
        >
          <X size={18} />
        </button>

        <div className="pr-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            On-chain wallet
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">
            Wallet Analytics
          </h3>
        </div>

        <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Wallet address
          </p>

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-sm text-zinc-200">
              {shortAddress}
            </span>

            <button
              type="button"
              aria-label="Copy wallet address"
              onClick={() => void navigator.clipboard?.writeText(walletAddress)}
              className="rounded-lg border border-zinc-800 p-2 text-zinc-500 transition hover:text-white"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs leading-5 text-zinc-500">
          Performance metrics are shown only when verified on-chain data is
          available. Black Bull does not display estimated or simulated
          wallet statistics.
        </p>

        <button
          onClick={() => onViewWalletDetail(walletAddress)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-zinc-200"
        >
          View on-chain analytics
          <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
