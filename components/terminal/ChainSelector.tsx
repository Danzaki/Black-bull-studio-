"use client";

import { CHAIN_LIST } from "@/lib/chains";
import { useChain } from "@/lib/chains/ChainContext";

export default function ChainSelector() {
  const { chainId, setChain } = useChain();
  return (
    <div className="flex gap-1 overflow-x-auto px-3 py-1.5 no-scrollbar">
      {CHAIN_LIST.map((c) => (
        <button
          key={c.id}
          onClick={() => setChain(c.id)}
          className={`h-7 shrink-0 whitespace-nowrap rounded-md px-3 text-[11px] font-semibold transition active:scale-95 ${
            chainId === c.id
              ? "bg-bb-accent text-black"
              : "bg-bb-raised text-zinc-400"
          }`}
        >
          {c.name}
        </button>
      ))}
    </div>
  );
}
