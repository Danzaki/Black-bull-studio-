"use client";

import { useState } from "react";

export default function PromptEditor() {
  const [prompt, setPrompt] = useState("");

  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
      <h2 className="text-2xl font-bold text-yellow-400">
        AI Prompt Editor
      </h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your meme idea..."
        className="mt-6 h-40 w-full rounded-xl border border-zinc-700 bg-black p-4 text-white"
      />

      <button className="mt-6 w-full rounded-xl bg-yellow-500 py-3 font-bold text-black">
        Generate with AI
      </button>
    </div>
  );
}
