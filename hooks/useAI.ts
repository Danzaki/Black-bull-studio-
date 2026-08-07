"use client";

import { useState } from "react";
import { buildPrompt } from "@/services/ai/promptBuilder";
import { generateImage } from "@/services/ai/generateImage";

export function useAI() {
  const [loading, setLoading] = useState(false);

  async function generate(
    prompt: string,
    style: any,
    aspectRatio: any
  ) {
    setLoading(true);

    try {
      const finalPrompt = buildPrompt({
        prompt,
        style,
        aspectRatio,
      });

      const result = await generateImage({
        prompt: finalPrompt,
        style,
        aspectRatio,
      });

      return result;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    generate,
  };
}
