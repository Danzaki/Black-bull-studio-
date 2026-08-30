"use client";

import React from "react";
import { X, ExternalLink, TrendingUp, Award, DollarSign, ArrowUpRight } from "lucide-react";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#12131a] border border-zinc-800 rounded-2xl w-full max-w-md p-5 relative text-zinc-100 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/50"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
            🧠
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Smart Money Wallet</h3>
            <p className="text-xs text-zinc-400 font-mono">
              {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5 font-mono">
          <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/50">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <DollarSign size={12} className="text-emerald-400" /> Est. 30D PnL
            </span>
            <p className="text-emerald-400 font-bold text-base mt-1">+$18,420.50</p>
          </div>
          <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/50">
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Award size={12} className="text-amber-400" /> Win Rate
            </span>
            <p className="text-amber-400 font-bold text-base mt-1">88.5%</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onViewWalletDetail(walletAddress)}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition"
        >
          <span>Full On-Chain Analytics</span>
          <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}
