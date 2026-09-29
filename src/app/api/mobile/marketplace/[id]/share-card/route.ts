import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { loadUsedListingShareCard } from "@/lib/used-listing-share-card";

/** Bearer mirror of /api/used/listings/[id]/share-card */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-used-listing-share-card", 90);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { id } = await ctx.params;
  if (!id || id.length > 40) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const listing = await loadUsedListingShareCard(id);
  if (!listing) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, listing });
}
