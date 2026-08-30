import { NextResponse } from "next/server";
import { HolderDistributionData } from "@/types/holders";

export async function GET() {
  const data: HolderDistributionData = {
    top10Percentage: 42.5,
    insiderPercentage: 18.2,
    devHoldingPercentage: 3.5,
    holders: [
      {
        address: "Raydium Authority / LP",
        label: "Raydium Vault",
        percentage: 35.0,
        balanceFormatted: "350,000,000",
        isDevOrInsider: false,
        isLiquidityPool: true,
      },
      {
        address: "DEV99...44z1",
        label: "Developer Wallet",
        percentage: 3.5,
        balanceFormatted: "35,000,000",
        isDevOrInsider: true,
        isLiquidityPool: false,
      },
      {
        address: "INSIDER88...11k2",
        label: "Sniper / Cluster 1",
        percentage: 8.2,
        balanceFormatted: "82,000,000",
        isDevOrInsider: true,
        isLiquidityPool: false,
      },
      {
        address: "INSIDER77...33x9",
        label: "Cluster 2",
        percentage: 6.5,
        balanceFormatted: "65,000,000",
        isDevOrInsider: true,
        isLiquidityPool: false,
      },
      {
        address: "4kL2...8mQ1",
        percentage: 2.8,
        balanceFormatted: "28,000,000",
        isDevOrInsider: false,
        isLiquidityPool: false,
      },
    ],
  };

  return NextResponse.json(data);
}
