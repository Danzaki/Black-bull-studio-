"use client";

import { useState } from "react";
import { useAI } from "@/hooks/useAI";

export default function PromptEditor() {
  const [prompt, setPrompt] = useState("");

  const { loading, generate } = useAI();

  async function handleGenerate() {
    const result = await generate(
      prompt,
      "Luxury",
      "1:1"
    );

    console.log(result);
  }

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

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-yellow-500 py-3 font-bold text-black disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate with AI"}
      </button>
    </div>
  );
}
