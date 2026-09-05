import { NextResponse } from "next/server";

export async function GET() {
  const mockPositions = [
    {
      id: "pos-1",
      symbol: "SOL",
      entryPrice: 140.5,
      currentPrice: 148.2,
      amount: 12.5,
      pnlSOL: 0.962,
      pnlPercent: 5.48,
    },
    {
      id: "pos-2",
      symbol: "BONK",
      entryPrice: 0.000018,
      currentPrice: 0.000021,
      amount: 50000000,
      pnlSOL: 0.45,
      pnlPercent: 16.67,
    },
  ];

  return NextResponse.json(mockPositions);
}
