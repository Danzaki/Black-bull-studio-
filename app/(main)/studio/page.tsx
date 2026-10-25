"use client";

import { useState } from "react";
import { Download, Trash2, Send } from "lucide-react";
import PromptEditor from "@/components/studio/PromptEditor";
import BullPanel from "@/components/studio/BullPanel";
import StyleSelector from "@/components/studio/StyleSelector";
import AspectRatioSelector from "@/components/studio/AspectRatioSelector";
import PromptLibrary from "@/components/studio/PromptLibrary";
import AssetManager from "@/components/studio/AssetManager";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { notify } from "@/lib/notify";

export default function StudioPage() {
  const supabase = getSupabaseClient();
  const [activeTab, setActiveTab] = useState<"generate" | "library" | "assets">("generate");
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("Luxury");
  const [selectedRatio, setSelectedRatio] = useState("1:1");
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  function handleClear() {
    setGeneratedImage(null);
    setCaption("");
  }

  async function handleDownload() {
    if (!generatedImage) return;
    setDownloading(true);
    try {
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `black-bull-meme-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      notify("Failed to download image");
    } finally {
      setDownloading(false);
    }
  }

  async function handlePostToCommunity() {
    if (!generatedImage || posting) return;
    setPosting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      notify("Please log in to post");
      setPosting(false);
      return;
    }

    const { error } = await supabase.from("posts").insert({
      content: caption.trim() || "Made with Black Bull AI Studio 🐂🎨",
      image_url: generatedImage,
      user_id: user.id,
    });

    if (error) {
      notify("Error posting: " + error.message);
    } else {
      notify("Posted to Community!");
      handleClear();
    }
    setPosting(false);
  }

  const tabs = [
    { id: "generate" as const, label: "Generate" },
    { id: "library" as const, label: "Library" },
    { id: "assets" as const, label: "Assets" },
  ];

  return (
      <main className="min-h-screen bg-bbl-bg text-bbl-text pb-24 [color-scheme:light]">
        <div className="mx-auto max-w-2xl">
          <div className="sticky top-14 z-30 flex border-b border-bbl-border bg-bbl-bg/95 backdrop-blur-md mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[48px] flex-1 text-sm font-semibold border-b-[3px] transition ${
                  activeTab === tab.id
                    ? "border-bbl-accent text-bbl-text"
                    : "border-transparent text-bbl-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "generate" && (
            <div className="space-y-4 px-4">
              <BullPanel />
              <PromptEditor
                prompt={prompt}
                onPromptChange={setPrompt}
                style={selectedStyle}
                aspectRatio={selectedRatio}
                onGenerated={(url) => setGeneratedImage(url)}
              />
              <StyleSelector selected={selectedStyle} onSelect={setSelectedStyle} />
              <AspectRatioSelector selected={selectedRatio} onSelect={setSelectedRatio} />

              <div className="rounded-2xl border border-bbl-border bg-bbl-surface p-3">
                <div className="flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl bg-bbl-text/[0.04]">
                  {generatedImage ? (
                    <img src={generatedImage} alt="AI Generated Result" className="max-h-[480px] w-full object-contain" />
                  ) : (
                    <p className="px-6 text-center text-sm text-bbl-muted">Your image will appear here.</p>
                  )}
                </div>

                {generatedImage && (
                  <div className="mt-3 space-y-3">
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a caption (optional)..."
                      className="min-h-[70px] w-full resize-none rounded-xl border border-bbl-border bg-bbl-bg p-3 text-base text-bbl-text outline-none placeholder:text-bbl-muted focus:border-bbl-accent"
                      maxLength={280}
                    />
                    <button
                      onClick={handlePostToCommunity}
                      disabled={posting}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-bbl-accent text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {posting ? "Posting..." : "Post to Community"}
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-bbl-border text-sm font-semibold transition active:scale-95 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        {downloading ? "Saving..." : "Download"}
                      </button>
                      <button
                        onClick={handleClear}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-bbl-border text-sm font-semibold text-bbl-like transition active:scale-95"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "library" && (
            <PromptLibrary
              onSelect={(selectedPrompt) => {
                setPrompt(selectedPrompt);
                setActiveTab("generate");
              }}
            />
          )}

          {activeTab === "assets" && <AssetManager />}
        </div>
      </main>
  );
}
