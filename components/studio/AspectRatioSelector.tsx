"use client";

const ratios = [
  { name: "Square", value: "1:1" },
  { name: "Portrait", value: "4:5" },
  { name: "Landscape", value: "16:9" },
  { name: "Story", value: "9:16" },
];

export default function AspectRatioSelector() {
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
      <h2 className="text-xl font-bold text-yellow-400">
        📐 Aspect Ratio
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {ratios.map((ratio) => (
          <button
            key={ratio.value}
            className="rounded-xl border border-zinc-700 bg-black p-4 text-center transition hover:border-yellow-400 hover:bg-yellow-500 hover:text-black"
          >
            <p className="font-semibold">{ratio.name}</p>
            <p className="mt-1 text-sm opacity-80">{ratio.value}</p>
          </button>
        ))}
      </div>
    </div>
  );
}