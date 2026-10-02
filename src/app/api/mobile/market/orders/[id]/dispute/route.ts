import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { openMarketplaceDispute } from "@/actions/marketplace-checkout";
import type { MarketplaceDisputeReason } from "@prisma/client";

type Body = {
  reason?: string;
  reasonCode?: MarketplaceDisputeReason;
  evidenceUrls?: string[];
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-market-dispute", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const { id: orderId } = await params;
  if (!orderId || orderId.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const evidenceUrls = Array.isArray(body.evidenceUrls)
    ? body.evidenceUrls.filter((u): u is string => typeof u === "string").slice(0, 12)
    : [];

  const result = await openMarketplaceDispute(
    orderId,
    reason,
    body.reasonCode,
    evidenceUrls
  );

  if (result.error) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
