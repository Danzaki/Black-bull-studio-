import { getSupabaseClient } from "@/lib/supabaseClient";

export interface GenerateImageOptions {
  prompt: string;
  style: string;
  aspectRatio: string;
}

export interface GenerateImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { success: false, error: "Please sign in to generate images." };
    }

    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(options),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.imageUrl) {
      return { success: false, error: json.error || "Failed to generate image." };
    }
    return { success: true, imageUrl: json.imageUrl };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate image." };
  }
}
