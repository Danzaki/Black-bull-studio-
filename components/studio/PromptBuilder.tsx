"use client";

import { useMemo, useState } from "react";

const GROUPS: { key: string; label: string; options: string[] }[] = [
  { key: "subject", label: "Subject", options: ["a muscular black bull", "a golden bull", "a robot bull", "an astronaut bull", "a samurai bull", "a pirate bull", "a wizard bull", "a cyberpunk bull", "a baby bull", "a bull king", "a bull DJ", "a bull boxer", "a wolf", "a dragon", "an eagle", "a fox"] },
  { key: "action", label: "Action", options: ["charging forward", "standing on a mountain", "trading on a laptop", "holding a glowing diamond", "breaking through a wall", "riding a rocket", "sitting on a throne", "walking through rain", "celebrating with confetti", "meditating calmly"] },
  { key: "setting", label: "Setting", options: ["futuristic city at night", "stock market trading floor", "desert at sunset", "snowy mountain peak", "underwater ruins", "neon-lit alley", "floating space station", "ancient temple", "misty forest", "rooftop skyline"] },
  { key: "style", label: "Style", options: ["cinematic photo", "3D render", "anime style", "oil painting", "pixel art", "comic book style", "watercolor painting", "synthwave style", "low poly 3D", "vintage poster style", "claymation style", "ink sketch"] },
  { key: "light", label: "Light & mood", options: ["dramatic lighting", "golden hour", "moody and dark", "bright and playful", "glowing neon", "soft dreamy glow", "high contrast", "foggy atmosphere"] },
  { key: "color", label: "Colors", options: ["black and gold", "electric blue and purple", "red and orange", "emerald green", "pastel colors", "monochrome", "teal and pink", "silver and white"] },
  { key: "outfit", label: "Outfit", options: ["wearing a hoodie", "wearing a gold chain", "wearing a suit and tie", "wearing samurai armor", "wearing a space suit", "wearing sunglasses", "wearing a crown", "wearing a leather jacket", "wearing a pirate hat", "wearing headphones"] },
  { key: "expression", label: "Expression", options: ["fierce look", "calm smile", "laughing out loud", "determined stare", "cool and confident", "surprised face", "sleepy eyes", "angry snort"] },
  { key: "extras", label: "Extras", options: ["holding a glowing coin", "holding a trophy", "carrying a flag", "with floating diamonds", "surrounded by fire", "with lightning behind", "with butterflies around", "with a golden chart behind"] },
  { key: "camera", label: "Camera", options: ["close-up portrait", "wide shot", "low angle hero shot", "aerial view", "side profile", "fisheye lens", "symmetrical front view", "macro detail"] },
];

const RECIPES: { label: string; fix: Record<string, string> }[] = [
  { label: "Trading bull", fix: { subject: "a muscular black bull", setting: "stock market trading floor", style: "cinematic photo", color: "black and gold" } },
  { label: "Bull king", fix: { subject: "a bull king", action: "sitting on a throne", style: "oil painting", color: "black and gold" } },
  { label: "Rocket bull", fix: { subject: "a muscular black bull", action: "riding a rocket", style: "comic book style" } },
  { label: "Samurai bull", fix: { subject: "a samurai bull", style: "anime style" } },
  { label: "Cyber bull", fix: { subject: "a cyberpunk bull", setting: "neon-lit alley", style: "synthwave style", light: "glowing neon" } },
  { label: "Poster bull", fix: { subject: "a muscular black bull", style: "vintage poster style", light: "high contrast", color: "black and gold" } },
  { label: "Pixel bull", fix: { subject: "a muscular black bull", style: "pixel art" } },
  { label: "Chill bull", fix: { subject: "a muscular black bull", action: "meditating calmly", style: "3D render", light: "soft dreamy glow" } },
];

export default function PromptBuilder({ onSelect }: { onSelect: (prompt: string) => void }) {
  const [pick, setPick] = useState<Record<string, number | null>>({});

  const prompt = useMemo(() => {
    const parts: string[] = [];
    for (const g of GROUPS) {
      const i = pick[g.key];
      if (typeof i === "number") parts.push(g.options[i]);
    }
    return parts.join(", ");
  }, [pick]);

  function toggle(key: string, i: number) {
    setPick((p) => ({ ...p, [key]: p[key] === i ? null : i }));
  }

  function build(p: Record<string, number | null>) {
    const parts: string[] = [];
    for (const g of GROUPS) {
      const i = p[g.key];
      if (typeof i === "number") parts.push(g.options[i]);
    }
    return parts.join(", ");
  }

  function applyRecipe(fix: Record<string, string>) {
    const next: Record<string, number | null> = {};
    for (const g of GROUPS) {
      const want = fix[g.key];
      const idx = want ? g.options.indexOf(want) : -1;
      next[g.key] = idx >= 0 ? idx : Math.floor(Math.random() * g.options.length);
    }
    setPick(next);
    onSelect(build(next));
  }

  function surprise() {
    const next: Record<string, number | null> = {};
    for (const g of GROUPS) next[g.key] = Math.floor(Math.random() * g.options.length);
    setPick(next);
  }

  return (
    <div className="rounded-xl border border-bbl-border bg-bbl-text/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-bbl-accent">🧩 Prompt Builder</h2>
        <button type="button" onClick={surprise} className="rounded-lg border border-bbl-accent/60 px-3 py-1.5 text-xs font-bold text-bbl-accent">
          🎲 Surprise me
        </button>
      </div>
      <div className="space-y-3">
        <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-bbl-accent">Bull recipes (random every tap)</p>
            <div className="flex flex-wrap gap-1.5">
              {RECIPES.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyRecipe(p.fix)}
                  className="rounded-full border border-bbl-accent/50 bg-bbl-accent/10 px-3 py-1.5 text-xs font-semibold text-bbl-accent transition active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          {GROUPS.map((g) => (
          <div key={g.key}>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-bbl-muted">{g.label}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.options.map((o, i) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggle(g.key, i)}
                  className={
                    "rounded-full border px-3 py-1.5 text-xs transition " +
                    (pick[g.key] === i ? "border-bbl-accent bg-bbl-accent/15 text-bbl-accent" : "border-bbl-border text-bbl-text")
                  }
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 min-h-[2.5rem] rounded-lg bg-bbl-text/[0.06] p-3 text-xs text-bbl-text">{prompt || "Pick options above, or tap Surprise me."}</p>
      <button
        type="button"
        disabled={!prompt}
        onClick={() => onSelect(prompt)}
        className="mt-3 w-full rounded-lg bg-bbl-accent py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Use this prompt
      </button>
    </div>
  );
}
