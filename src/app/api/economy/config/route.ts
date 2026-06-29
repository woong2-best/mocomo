import { NextResponse } from "next/server";
import { getPublicEconomyConfig } from "@/lib/apt/economy/config-service";

export const dynamic = "force-dynamic";

/** 앱·클라이언트 — 최신 published 경제 설정 */
export async function GET() {
  const config = await getPublicEconomyConfig();
  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
