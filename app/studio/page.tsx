"use client";

import { useState } from "react";
import PromptEditor from "@/components/studio/PromptEditor";
import StyleSelector from "@/components/studio/StyleSelector";
import AspectRatioSelector from "@/components/studio/AspectRatioSelector";
import AppShell from "@/components/layout/AppShell";

export default function StudioPage() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  return (
    <AppShell>
      <main className="min-h-screen bg-black text-white p-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#f5b942]">
              AI Meme Studio
            </h1>
            <p className="mt-2 text-xs text-zinc-400">
              Create premium AI-powered memes, campaigns, and visual concepts.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <PromptEditor onGenerated={(url) => setGeneratedImage(url)} />
            <StyleSelector />
          </div>

          <div className="mt-8">
            <AspectRatioSelector />
          </div>

          {/* AI Preview Section */}
          <div className="mt-10 rounded-2xl border border-[#f5b942]/30 bg-zinc-900 p-6">
            <h2 className="text-xl font-bold text-[#f5b942]">
              🖼️ AI Preview
            </h2>

            <div className="mt-6 flex min-h-[350px] items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 overflow-hidden bg-black/50">
              {generatedImage ? (
                <img
                  src={generatedImage}
                  alt="AI Generated Result"
                  className="max-h-[500px] w-full object-contain rounded-lg"
                />
              ) : (
                <p className="text-xs text-zinc-500">
                  Your AI generated image will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
