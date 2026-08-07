"use client";

const styles = [
  "Luxury",
  "Cyberpunk",
  "Meme",
  "Anime",
  "Realistic",
  "Pixel Art",
];

export default function StyleSelector() {
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
      <h2 className="text-xl font-bold text-yellow-400">
        🎨 AI Style
      </h2>

      <div className="mt-6 flex flex-wrap gap-3">
        {styles.map((style) => (
          <button
            key={style}
            className="rounded-xl border border-zinc-700 px-5 py-3 text-white transition hover:border-yellow-400 hover:bg-yellow-500 hover:text-black"
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
}