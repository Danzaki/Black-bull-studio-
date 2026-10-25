"use client";

import { useAI } from "@/hooks/useAI";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { notify } from "@/lib/notify";

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
    if (!prompt.trim()) return notify("Please describe your meme idea!");

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
      notify("Failed to generate image: " + result.error);
    }
  }

  return (
    <div className="rounded-2xl border border-bbl-border bg-bbl-surface p-4">
      <p className="text-sm font-semibold text-bbl-text">Describe your idea</p>

      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="Describe your meme idea..."
        className="mt-2 h-32 w-full resize-none rounded-xl border border-bbl-border bg-bbl-bg p-3 text-base text-bbl-text outline-none placeholder:text-bbl-muted focus:border-bbl-accent"
      />

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="mt-3 h-12 w-full rounded-xl bg-bbl-accent text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? "Generating Image..." : "Generate with AI"}
      </button>
    </div>
  );
}
