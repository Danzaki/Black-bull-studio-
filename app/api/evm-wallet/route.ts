import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseServer";
import { ensureEvmWallet } from "@/lib/evmCustodial";
import { getEvmBalance } from "@/lib/evmWallet";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  try {
    const address = await ensureEvmWallet(user.id);
    const [bsc, base] = await Promise.all([
      getEvmBalance("bsc", address).catch(() => null),
      getEvmBalance("base", address).catch(() => null),
    ]);
    return NextResponse.json({ address, balances: { bsc, base } });
  } catch {
    return NextResponse.json({ error: "Wallet unavailable." }, { status: 500 });
  }
}
