"use client";

import { useState } from "react";

const ratios = [
  { label: "Square", value: "1:1" },
  { label: "Portrait", value: "4:5" },
  { label: "Landscape", value: "16:9" },
  { label: "Story", value: "9:16" },
];

export default function AspectRatioSelector() {
  const [selected, setSelected] = useState("1:1");

  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
      <h2 className="text-xl font-bold text-yellow-400">
        📐 Aspect Ratio
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {ratios.map((ratio) => (
          <button
            key={ratio.value}
            onClick={() => setSelected(ratio.value)}
            className={`rounded-xl p-4 transition ${
              selected === ratio.value
                ? "bg-yellow-500 text-black"
                : "border border-zinc-700 text-white hover:border-yellow-400"
            }`}
          >
            <p className="font-semibold">{ratio.label}</p>
            <p className="text-sm">{ratio.value}</p>
          </button>
        ))}
      </div>
    </div>
  );
}