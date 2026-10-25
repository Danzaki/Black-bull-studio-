"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, Trash2, Send } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { notify, confirmDialog } from "@/lib/notify";

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
    const ok = await confirmDialog({ title: "Delete this image?", message: "This cannot be undone.", confirmLabel: "Delete", danger: true });
    if (!ok) return;
    setBusyId(id);
    const { error } = await supabase.from("studio_assets").delete().eq("id", id);
    if (!error) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
    } else {
      notify("Error deleting: " + error.message);
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
      notify("Failed to download image");
    }
  }

  async function handlePostToCommunity(asset: Asset) {
    setBusyId(asset.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      notify("Please log in to post");
      setBusyId(null);
      return;
    }

    const { error } = await supabase.from("posts").insert({
      content: asset.prompt || "Made with Black Bull AI Studio 🐂🎨",
      image_url: asset.image_url,
      user_id: user.id,
    });

    if (error) {
      notify("Error posting: " + error.message);
    } else {
      notify("Posted to Community!");
    }
    setBusyId(null);
  }

  if (loading) {
    return <div className="grid grid-cols-2 gap-3 px-4">{[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square animate-pulse rounded-2xl bg-bbl-text/5" />)}</div>;
  }

  if (assets.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-bbl-muted">No assets yet — generate your first image to see it here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {assets.map((asset) => (
        <div key={asset.id} className="overflow-hidden rounded-2xl border border-bbl-border bg-bbl-surface">
          <img src={asset.image_url} alt={asset.prompt || "Generated asset"} className="aspect-square w-full object-cover" />
          <div className="space-y-2 p-2.5">
            {asset.prompt && (
              <p className="text-xs text-bbl-muted line-clamp-2">{asset.prompt}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePostToCommunity(asset)}
                disabled={busyId === asset.id}
                className="flex h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-bbl-accent text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Post
              </button>
              <button
                onClick={() => handleDownload(asset.image_url)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-bbl-border text-bbl-text transition active:scale-95"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleDelete(asset.id)}
                disabled={busyId === asset.id}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-bbl-border text-bbl-like transition active:scale-95 disabled:opacity-50"
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
