import { NextResponse } from "next/server";
import { SniperConfig, PendingSnipe } from "@/types/sniper";

export async function GET() {
  const defaultConfig: SniperConfig = {
    autoSnipeEnabled: true,
    mevProtection: true,
    maxBuyAmountSOL: 1.0,
    minLiquidityUSD: 5000,
    slippagePercent: 15,
    jitoTipSOL: 0.005,
    antiRugAutoSell: true,
  };

  const pendingSnipes: PendingSnipe[] = [
    {
      id: "snip-1",
      tokenMint: "PUMP99...77x1",
      symbol: "NEO-DOGE",
      targetBuySOL: 0.5,
      status: "EXECUTED",
      timestamp: "1 min ago",
    },
    {
      id: "snip-2",
      tokenMint: "RAY88...22k4",
      symbol: "SOL-PEPE",
      targetBuySOL: 1.0,
      status: "SNIPING",
      timestamp: "Just now",
    },
  ];

  return NextResponse.json({ config: defaultConfig, pendingSnipes });
}
