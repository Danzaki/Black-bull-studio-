import { NextResponse } from "next/server";
import { PriorityFeeConfig } from "@/types/gas";

export async function GET() {
  const defaultConfig: PriorityFeeConfig = {
    preset: "TURBO",
    priorityFeeSOL: 0.003,
    jitoTipSOL: 0.005,
    maxComputeUnits: 200000,
    autoFeeAdjustment: true,
  };

  return NextResponse.json(defaultConfig);
}
