import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { MARKET_UNAVAILABLE_KO } from "@/lib/marketplace/market-access";

/** @deprecated Stripe-only — direct trade disabled */
export async function POST(_req: NextRequest) {
  const limited = await rateLimitPublicApi(_req, "market-direct-checkout", 20);
  if (limited) return limited;
  return NextResponse.json({ error: MARKET_UNAVAILABLE_KO }, { status: 410 });
}

export async function PATCH(_req: NextRequest) {
  const limited = await rateLimitPublicApi(_req, "market-direct-checkout", 20);
  if (limited) return limited;
  return NextResponse.json({ error: MARKET_UNAVAILABLE_KO }, { status: 410 });
}
