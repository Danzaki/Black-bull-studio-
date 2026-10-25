"use client";

const ratios = [
  { label: "Square", value: "1:1" },
  { label: "Portrait", value: "4:5" },
  { label: "Landscape", value: "16:9" },
  { label: "Story", value: "9:16" },
];

interface AspectRatioSelectorProps {
  selected: string;
  onSelect: (ratio: string) => void;
}

export default function AspectRatioSelector({ selected, onSelect }: AspectRatioSelectorProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-bbl-text">Shape</p>
      <div className="grid grid-cols-4 gap-2">
        {ratios.map((ratio) => (
          <button
            key={ratio.value}
            type="button"
            onClick={() => onSelect(ratio.value)}
            aria-pressed={selected === ratio.value}
            className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl transition active:scale-95 ${
              selected === ratio.value
                ? "bg-bbl-accent text-white"
                : "border border-bbl-border bg-bbl-surface text-bbl-text"
            }`}
          >
            <span className="text-sm font-semibold">{ratio.value}</span>
            <span className="text-[11px] opacity-70">{ratio.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
