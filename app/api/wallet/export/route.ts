import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { getServiceClient } from "@/lib/custodialWallet";
import { decryptSniperSecretKey } from "@/lib/sniperWalletCrypto";
import { sendPushNotification } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user || !user.email) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let password = "";
  try { password = String((await request.json()).password ?? ""); } catch {}
  if (!password) return NextResponse.json({ error: "Password required." }, { status: 400 });

  const db = getServiceClient();
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await db
    .from("key_exports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if ((count ?? 0) >= 3) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });

  // Rubuta kafin tabbatarwa, don a kirga ko gwajin da ya kasa
  await db.from("key_exports").insert({ user_id: user.id });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: "Not configured." }, { status: 500 });
  const verifier = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: signIn, error: signErr } = await verifier.auth.signInWithPassword({ email: user.email, password });
  if (signErr || signIn.user?.id !== user.id) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
  }

  await verifier.auth.signOut();
  const { data } = await db
    .from("custodial_wallets")
    .select("encrypted_secret_key, iv")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "Wallet not found." }, { status: 404 });

  try {
    const secret = decryptSniperSecretKey({ encryptedSecretKey: data.encrypted_secret_key, iv: data.iv }, user.id);
    try {
      const { data: rows } = await db.from("push_tokens").select("token").eq("user_id", user.id);
      const tokens = (rows ?? []).map((r: { token: string }) => r.token);
      if (tokens.length > 0) {
        await sendPushNotification(
          tokens,
          "Security alert",
          "Your wallet private key was exported. If this wasn't you, change your password now.",
          "/terminal/wallet-manager"
        );
      }
    } catch (e) {
      console.error("Export notify error:", e instanceof Error ? e.message : String(e));
    }

    return new NextResponse(JSON.stringify({ privateKey: secret }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Could not export key." }, { status: 500 });
  }
}
