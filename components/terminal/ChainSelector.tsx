"use client";

import { CHAIN_LIST } from "@/lib/chains";
import { useChain } from "@/lib/chains/ChainContext";

export default function ChainSelector() {
  const { chainId, setChain } = useChain();
  return (
    <div className="flex gap-2 overflow-x-auto px-3 py-2">
      {CHAIN_LIST.map((c) => (
        <button
          key={c.id}
          onClick={() => setChain(c.id)}
          className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm transition ${
            chainId === c.id
              ? "border-white bg-white text-black"
              : "border-white/20 text-white/70"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
