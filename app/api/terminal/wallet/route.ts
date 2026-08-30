import { NextResponse } from "next/server";

export async function GET() {
  const mockWallet = {
    address: "7xKXtg2CW87d97TXJSDpbD5jBk45...BULL",
    solBalance: 14.85,
    usdcBalance: 1250.40,
    tokens: [
      { symbol: "SOL", balance: 14.85, usdValue: 2197.8 },
      { symbol: "BONK", balance: 50000000, usdValue: 1050.0 },
    ],
  };

  return NextResponse.json(mockWallet);
}
