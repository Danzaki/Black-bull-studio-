import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const key = process.env.POLLINATIONS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Image service is not configured." }, { status: 500 });
  }

  const sp = request.nextUrl.searchParams;
  const prompt = (sp.get("prompt") || "").trim().slice(0, 800);
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const clamp = (v: string | null, d: number) => {
    const n = Number.parseInt(v || "", 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 256), 1536) : d;
  };
  const width = clamp(sp.get("width"), 1024);
  const height = clamp(sp.get("height"), 1024);
  const seed = Number.parseInt(sp.get("seed") || "", 10) || 0;

  try {
    const upstream = await fetch(
      `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`,
      { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" }
    );

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Pollinations error", upstream.status, detail.slice(0, 300));
      return NextResponse.json(
        { error: "Image generation failed.", status: upstream.status },
        { status: 502 }
      );
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image service unreachable." }, { status: 502 });
  }
}
