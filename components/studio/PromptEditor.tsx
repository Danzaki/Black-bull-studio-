"use client";

import { useAI } from "@/hooks/useAI";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface PromptEditorProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  style: string;
  aspectRatio: string;
  onGenerated?: (imageUrl: string) => void;
}

export default function PromptEditor({ prompt, onPromptChange, style, aspectRatio, onGenerated }: PromptEditorProps) {
  const { loading, generate } = useAI();
  const supabase = getSupabaseClient();

  async function handleGenerate() {
    if (!prompt.trim()) return alert("Please describe your meme idea!");

    const result = await generate(prompt, style, aspectRatio);

    if (result.success && result.imageUrl) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from("studio_assets").insert({
          user_id: user.id,
          image_url: result.imageUrl,
          prompt: prompt,
          style: style,
          aspect_ratio: aspectRatio,
        });
        if (error) console.error("Error saving asset:", error.message);
      }

      if (onGenerated) {
        onGenerated(result.imageUrl);
      }
    } else {
      alert("Failed to generate image: " + result.error);
    }
  }

  return (
    <div className="rounded-2xl border border-[#f97316]/30 bg-stone-900 p-6">
      <h2 className="text-2xl font-bold text-[#f97316]">
        AI Prompt Editor
      </h2>

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="Describe your meme idea..."
        className="mt-6 h-40 w-full rounded-xl border border-stone-700 bg-[#f7f5f2] p-4 text-stone-900 outline-none focus:border-[#f97316]"
      />

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="mt-6 w-full rounded-xl bg-[#f97316] py-3 font-bold text-black hover:opacity-90 disabled:opacity-50 transition"
      >
        {loading ? "Generating Image..." : "Generate with AI"}
      </button>
    </div>
  );
}
