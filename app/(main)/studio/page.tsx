"use client";

import { useState } from "react";
import { Download, Trash2, Send } from "lucide-react";
import PromptEditor from "@/components/studio/PromptEditor";
import StyleSelector from "@/components/studio/StyleSelector";
import AspectRatioSelector from "@/components/studio/AspectRatioSelector";
import PromptLibrary from "@/components/studio/PromptLibrary";
import AssetManager from "@/components/studio/AssetManager";
import AppShell from "@/components/layout/AppShell";
import { getSupabaseClient } from "@/lib/supabaseClient";

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
      alert("Failed to download image");
    } finally {
      setDownloading(false);
    }
  }

  async function handlePostToCommunity() {
    if (!generatedImage || posting) return;
    setPosting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in to post");
      setPosting(false);
      return;
    }

    const { error } = await supabase.from("posts").insert({
      content: caption.trim() || "Made with Black Bull AI Studio 🐂🎨",
      image_url: generatedImage,
      user_id: user.id,
    });

    if (error) {
      alert("Error posting: " + error.message);
    } else {
      alert("Posted to Community!");
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
    <>
      <main className="min-h-screen bg-[#f7f5f2] text-stone-900 p-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#f97316]">
              AI Meme Studio
            </h1>
            <p className="mt-2 text-xs text-stone-400">
              Create premium AI-powered memes, campaigns, and visual concepts.
            </p>
          </div>

          <div className="flex gap-2 border-b border-stone-800 mb-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-bold border-b-2 transition ${
                  activeTab === tab.id
                    ? "border-[#f97316] text-[#f97316]"
                    : "border-transparent text-stone-500 hover:text-stone-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "generate" && (
            <>
              <div className="grid gap-8 lg:grid-cols-2">
                <PromptEditor
                  prompt={prompt}
                  onPromptChange={setPrompt}
                  style={selectedStyle}
                  aspectRatio={selectedRatio}
                  onGenerated={(url) => setGeneratedImage(url)}
                />
                <StyleSelector selected={selectedStyle} onSelect={setSelectedStyle} />
              </div>

              <div className="mt-8">
                <AspectRatioSelector selected={selectedRatio} onSelect={setSelectedRatio} />
              </div>

              <div className="mt-10 rounded-2xl border border-[#f97316]/30 bg-stone-900 p-6">
                <h2 className="text-xl font-bold text-[#f97316]">
                  🖼️ AI Preview
                </h2>

                <div className="mt-6 flex min-h-[350px] items-center justify-center rounded-xl border-2 border-dashed border-stone-700 overflow-hidden bg-[#f7f5f2]/50">
                  {generatedImage ? (
                    <img
                      src={generatedImage}
                      alt="AI Generated Result"
                      className="max-h-[500px] w-full object-contain rounded-lg"
                    />
                  ) : (
                    <p className="text-xs text-stone-500">
                      Your AI generated image will appear here.
                    </p>
                  )}
                </div>

                {generatedImage && (
                  <div className="mt-6 space-y-4">
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a caption for this post (optional)..."
                      className="w-full rounded-xl border border-stone-700 bg-[#f7f5f2] p-3 text-sm text-stone-900 outline-none focus:border-[#f97316] resize-none min-h-[70px]"
                      maxLength={280}
                    />

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handlePostToCommunity}
                        disabled={posting}
                        className="flex items-center gap-2 rounded-xl bg-[#f97316] px-5 py-2.5 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50 transition"
                      >
                        <Send className="h-4 w-4" />
                        {posting ? "Posting..." : "Post to Community"}
                      </button>

                      <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex items-center gap-2 rounded-xl border border-stone-700 px-5 py-2.5 text-sm font-bold text-stone-900 hover:border-[#f97316] disabled:opacity-50 transition"
                      >
                        <Download className="h-4 w-4" />
                        {downloading ? "Downloading..." : "Download"}
                      </button>

                      <button
                        onClick={handleClear}
                        className="flex items-center gap-2 rounded-xl border border-stone-700 px-5 py-2.5 text-sm font-bold text-rose-400 hover:border-rose-400 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
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
    </>
  );
}
