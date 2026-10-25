"use client";

const styles = ["Luxury", "Cyberpunk", "Meme", "Anime", "Realistic", "Pixel Art"];

interface StyleSelectorProps {
  selected: string;
  onSelect: (style: string) => void;
}

export default function StyleSelector({ selected, onSelect }: StyleSelectorProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-bbl-text">Style</p>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {styles.map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => onSelect(style)}
            aria-pressed={selected === style}
            className={`h-11 shrink-0 rounded-full px-5 text-sm font-semibold transition active:scale-95 ${
              selected === style
                ? "bg-bbl-accent text-white"
                : "border border-bbl-border bg-bbl-surface text-bbl-text"
            }`}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
}
