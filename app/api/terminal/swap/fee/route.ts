import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public config: the platform fee that /api/wallet/trade applies on Solana swaps.
export async function GET() {
  const account = process.env.JUPITER_REFERRAL_ACCOUNT;
  const n = Math.floor(Number(process.env.JUPITER_REFERRAL_FEE_BPS ?? 0));
  const feeBps = account && Number.isFinite(n) && n > 0 ? n : 0;
  return NextResponse.json({ feeBps });
}
