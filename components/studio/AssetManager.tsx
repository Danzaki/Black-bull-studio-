"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Trash2, Send } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface Asset {
  id: string;
  image_url: string;
  prompt: string | null;
  style: string | null;
  aspect_ratio: string | null;
  created_at: string;
}

export default function AssetManager() {
  const supabase = getSupabaseClient();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAssets([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("studio_assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching assets:", error.message);
    } else {
      setAssets(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  async function handleDelete(id: string) {
    setBusyId(id);
    const { error } = await supabase.from("studio_assets").delete().eq("id", id);
    if (!error) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert("Error deleting: " + error.message);
    }
    setBusyId(null);
  }

  async function handleDownload(imageUrl: string) {
    try {
      const response = await fetch(imageUrl);
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
    }
  }

  async function handlePostToCommunity(asset: Asset) {
    setBusyId(asset.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in to post");
      setBusyId(null);
      return;
    }

    const { error } = await supabase.from("posts").insert({
      content: asset.prompt || "Made with Black Bull AI Studio 🐂🎨",
      image_url: asset.image_url,
      user_id: user.id,
    });

    if (error) {
      alert("Error posting: " + error.message);
    } else {
      alert("Posted to Community!");
    }
    setBusyId(null);
  }

  if (loading) {
    return <p className="text-center text-xs text-zinc-500 py-10">Loading your assets...</p>;
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-zinc-400">No assets yet — generate your first image to see it here.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <div key={asset.id} className="rounded-2xl border border-zinc-700 bg-zinc-900 overflow-hidden">
          <img src={asset.image_url} alt={asset.prompt || "Generated asset"} className="w-full h-48 object-cover" />
          <div className="p-3 space-y-2">
            {asset.prompt && (
              <p className="text-xs text-zinc-400 line-clamp-2">{asset.prompt}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePostToCommunity(asset)}
                disabled={busyId === asset.id}
                className="flex items-center justify-center gap-1 flex-1 rounded-lg bg-[#f5b942] py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
              >
                <Send className="h-3 w-3" /> Post
              </button>
              <button
                onClick={() => handleDownload(asset.image_url)}
                className="flex items-center justify-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-bold text-white hover:border-[#f5b942]"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(asset.id)}
                disabled={busyId === asset.id}
                className="flex items-center justify-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-[11px] font-bold text-rose-400 hover:border-rose-400 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
