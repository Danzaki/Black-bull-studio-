"use client";

import { CHAIN_LIST, type ChainId } from "@/lib/chains";

export default function ChainChips({
  value,
  onChange,
}: {
  value: ChainId;
  onChange: (c: ChainId) => void;
}) {
  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
      {CHAIN_LIST.map((c) => {
        const active = c.id === value;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={
              "h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-semibold transition-colors " +
              (active
                ? "border-bb-accent bg-bb-accent/15 text-bb-accent"
                : "border-bb-border bg-bb-raised text-zinc-400 active:bg-bb-surface")
            }
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
