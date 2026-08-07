"use client";

import { useState } from "react";

const styles = [
  "Luxury",
  "Cyberpunk",
  "Meme",
  "Anime",
  "Realistic",
  "Pixel Art",
];

export default function StyleSelector() {
  const [selected, setSelected] = useState("Luxury");

  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
      <h2 className="text-xl font-bold text-yellow-400">
        🎨 AI Style
      </h2>

      <div className="mt-6 flex flex-wrap gap-3">
        {styles.map((style) => (
          <button
            key={style}
            onClick={() => setSelected(style)}
            className={`rounded-xl px-5 py-3 transition ${
              selected === style
                ? "bg-yellow-500 text-black"
                : "border border-zinc-700 text-white hover:border-yellow-400"
            }`}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
}