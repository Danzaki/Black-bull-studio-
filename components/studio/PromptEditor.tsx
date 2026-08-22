"use client";

import { useState } from "react";
import { useAI } from "@/hooks/useAI";

interface PromptEditorProps {
  onGenerated?: (imageUrl: string) => void;
}

export default function PromptEditor({ onGenerated }: PromptEditorProps) {
  const [prompt, setPrompt] = useState("");
  const { loading, generate } = useAI();

  async function handleGenerate() {
    if (!prompt.trim()) return alert("Please describe your meme idea!");

    const result = await generate(prompt, "Luxury", "1:1");

    if (result.success && result.imageUrl) {
      if (onGenerated) {
        onGenerated(result.imageUrl);
      }
    } else {
      alert("Failed to generate image: " + result.error);
    }
  }

  return (
    <div className="rounded-2xl border border-[#f5b942]/30 bg-zinc-900 p-6">
      <h2 className="text-2xl font-bold text-[#f5b942]">
        AI Prompt Editor
      </h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your meme idea..."
        className="mt-6 h-40 w-full rounded-xl border border-zinc-700 bg-black p-4 text-white outline-none focus:border-[#f5b942]"
      />

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="mt-6 w-full rounded-xl bg-[#f5b942] py-3 font-bold text-black hover:opacity-90 disabled:opacity-50 transition"
      >
        {loading ? "Generating Image..." : "Generate with AI"}
      </button>
    </div>
  );
}
