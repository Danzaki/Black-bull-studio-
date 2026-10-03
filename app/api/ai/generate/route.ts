import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SIZES: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "16:9": [1280, 720],
  "9:16": [720, 1280],
  "4:5": [1024, 1280],
};

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Please sign in to generate images." }, { status: 401 });
  }

  const apiKey = process.env.POLLINATIONS_API_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !supaUrl || !serviceKey) {
    return NextResponse.json({ error: "Image service is not configured." }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const prompt = String(body?.prompt || "").trim().slice(0, 500);
  const style = String(body?.style || "").slice(0, 40);
  if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });

  const [width, height] = SIZES[String(body?.aspectRatio)] ?? [1024, 1024];
  const full = `${prompt}. The main and only subject is: ${prompt}. ${style} style, high quality`;
  const seed = Math.floor(Math.random() * 1000000);

  try {
    const upstream = await fetch(
      `https://gen.pollinations.ai/image/${encodeURIComponent(full)}?width=${width}&height=${height}&seed=${seed}&nologo=true`,
      { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }
    );
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Pollinations error", upstream.status, detail.slice(0, 300));
      return NextResponse.json({ error: "Image generation failed." }, { status: 502 });
    }

    const type = upstream.headers.get("content-type") || "image/jpeg";
    const ext = type.includes("png") ? "png" : "jpg";
    const buf = Buffer.from(await upstream.arrayBuffer());
    const path = `${user.id}/${Date.now()}.${ext}`;

    const supabase = createClient(supaUrl, serviceKey);
    const { error } = await supabase.storage.from("post-images").upload(path, buf, { contentType: type });
    if (error) {
      console.error("Storage upload error", error.message);
      return NextResponse.json({ error: "Could not save the image." }, { status: 500 });
    }

    const { data } = supabase.storage.from("post-images").getPublicUrl(path);
    return NextResponse.json({ imageUrl: data.publicUrl });
  } catch {
    return NextResponse.json({ error: "Image service unreachable." }, { status: 502 });
  }
}
