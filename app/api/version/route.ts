import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "",
      build: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
