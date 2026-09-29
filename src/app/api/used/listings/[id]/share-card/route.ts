import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { loadUsedListingShareCard } from "@/lib/used-listing-share-card";

/** Lightweight used-listing snapshot for chat product cards. */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimitPublicApi(req, "used-listing-share-card", 90);
  if (limited) return limited;

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
