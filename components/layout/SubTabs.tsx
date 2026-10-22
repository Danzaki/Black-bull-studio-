"use client";

interface SubTabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

export default function SubTabs<T extends string>({ tabs, active, onChange }: SubTabsProps<T>) {
  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={isActive}
            className={[
              "h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition-all duration-150 active:scale-95",
              isActive
                ? "bg-bb-accent text-black"
                : "border border-bb-border bg-bb-raised text-zinc-400 hover:text-white",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
