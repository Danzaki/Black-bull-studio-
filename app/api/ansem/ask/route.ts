import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { getServiceClient } from "@/lib/custodialWallet";
import { ANSEM_FACTS, ANSEM_MINT, PRESETS } from "@/lib/ansemFacts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM = `You are the Ask Ansem assistant inside Black Bull Studio. Answer briefly (max 100 words) and plainly in English.
Rules:
- Use only the facts below. If you do not know, say "I don't know" and point to official channels. Never invent facts, numbers or addresses.
- Never give buy/sell advice, price predictions or profit promises.
- Warn about copycat tokens when relevant. Never ask for or accept seed phrases or private keys.
- You are not Ansem and not the project team. Do not speak for them.
- Official mint address: ${ANSEM_MINT ?? "not confirmed yet (do not guess one)"}.
Facts:${ANSEM_FACTS}`;

const RISKY = /(you should (buy|sell)|buy now|sell now|will (moon|pump|10x|100x)|guaranteed|to the moon|financial advice:? buy)/i;
const SAFE = "I can't give buy or sell advice or price predictions. Memecoins are very risky. Please check official channels and do your own research.";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const presetId = typeof body?.preset === "string" ? body.preset : "";
  if (presetId && PRESETS[presetId]) return NextResponse.json({ answer: PRESETS[presetId].a });

  const question = String(body?.question ?? "").trim().slice(0, 300);
  if (!question) return NextResponse.json({ error: "Question is required." }, { status: 400 });

  const key = process.env.POLLINATIONS_API_KEY;
  if (!key) return NextResponse.json({ error: "AI is not configured." }, { status: 500 });

  const db = getServiceClient();
  const { data: allowed, error: claimErr } = await db.rpc("claim_ansem_ask", { p_user: user.id, p_max: 10 });
  if (claimErr) return NextResponse.json({ error: "Could not process request." }, { status: 500 });
  if (!allowed) return NextResponse.json({ error: "Daily limit reached (10 questions). Try again tomorrow." }, { status: 429 });

  async function refund() {
    try {
      const { data } = await db.from("ansem_asks").select("id").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(1);
      if (data?.[0]) await db.from("ansem_asks").delete().eq("id", data[0].id);
    } catch {}
  }

  try {
    const res = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.POLLINATIONS_TEXT_MODEL || "openai",
        max_tokens: 350,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: question },
        ],
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Ansem AI error", res.status, (await res.text().catch(() => "")).slice(0, 200));
      await refund();
      return NextResponse.json({ error: "AI is unavailable right now." }, { status: 502 });
    }
    const data = await res.json();
    let answer = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!answer) { await refund(); return NextResponse.json({ error: "No answer. Try again." }, { status: 502 }); }
    if (RISKY.test(answer)) answer = SAFE;
    answer += "\n\nNot financial advice.";
    return NextResponse.json({ answer });
  } catch (e) {
    console.error("Ansem AI exception", e instanceof Error ? e.message : String(e));
    await refund();
    return NextResponse.json({ error: "AI is unavailable right now." }, { status: 502 });
  }
}
