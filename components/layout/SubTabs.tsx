"use client";

interface SubTabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}

export default function SubTabs<T extends string>({ tabs, active, onChange }: SubTabsProps<T>) {
  return (
    <div className="no-scrollbar flex items-center gap-4 overflow-x-auto">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-pressed={isActive}
            className={[
              "relative shrink-0 whitespace-nowrap py-1.5 text-[13px] font-semibold transition-colors",
              isActive
                ? "text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-bb-accent"
                : "text-zinc-500",
            ].join(" ")}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
