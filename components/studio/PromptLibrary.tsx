"use client";

import PromptBuilder from "@/components/studio/PromptBuilder";

interface LibraryItem {
  title: string;
  prompt: string;
  emoji: string;
}

const promptIdeas: LibraryItem[] = [
  { title: "Crypto Bull", prompt: "A muscular black bull wearing gold sunglasses and a designer suit, standing in front of a stock market chart going up, dramatic lighting", emoji: "🐂" },
  { title: "Breaking Through", prompt: "A bull breaking through a brick wall made of dollar bills, fire and sparks flying, cinematic style", emoji: "💥" },
  { title: "Night Trader", prompt: "A bull sitting at a laptop trading crypto at 3am, energy drinks around, neon glow", emoji: "💻" },
  { title: "Golden Statue", prompt: "A golden bull statue on top of a mountain of gold coins, sunrise in the background, epic fantasy style", emoji: "🏆" },
  { title: "City Skyline", prompt: "A bull silhouette standing on a skyscraper rooftop overlooking a futuristic city skyline at night", emoji: "🌆" },
  { title: "Diamond Hands", prompt: "A bull holding a giant diamond in its hooves, glowing particles, luxury aesthetic", emoji: "💎" },
];

const memeTemplates: LibraryItem[] = [
  { title: "Distracted Bull", prompt: "A bull looking back distracted at a glowing green candle chart while walking away from a red candle chart, meme comic style", emoji: "👀" },
  { title: "This Is Fine", prompt: "A bull calmly sitting in a room on fire, everything is fine, meme style illustration", emoji: "🔥" },
  { title: "Galaxy Brain", prompt: "A bull's brain expanding through galaxy levels representing increasingly smart trading decisions, meme format", emoji: "🧠" },
  { title: "Drake Approve", prompt: "A stylish bull rejecting one option and approving another, two-panel meme format, bold comic style", emoji: "👍" },
];

function LibraryGrid({ items, onSelect }: { items: LibraryItem[]; onSelect: (prompt: string) => void }) {
  return (
    <div className="grid gap-2.5">
      {items.map((item) => (
        <button
          key={item.title}
          onClick={() => onSelect(item.prompt)}
          className="min-h-[64px] text-left rounded-2xl border border-bbl-border bg-bbl-surface p-3.5 transition active:scale-[0.98] active:bg-bbl-text/5"
        >
          <p className="text-[15px] font-semibold text-bbl-text">{item.emoji} {item.title}</p>
          <p className="mt-1 text-sm text-bbl-muted line-clamp-2">{item.prompt}</p>
        </button>
      ))}
    </div>
  );
}

export default function PromptLibrary({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="space-y-6 px-4">
      <PromptBuilder onSelect={onSelect} />
      <div>
        <h2 className="mb-3 text-base font-bold text-bbl-text">💡 Prompt ideas</h2>
        <LibraryGrid items={promptIdeas} onSelect={onSelect} />
      </div>

      <div>
        <h2 className="mb-3 text-base font-bold text-bbl-text">🖼️ Meme templates</h2>
        <LibraryGrid items={memeTemplates} onSelect={onSelect} />
      </div>
    </div>
  );
}
