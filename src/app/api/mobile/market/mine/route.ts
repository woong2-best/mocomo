import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";

/** Seller's own STAR market listings (Bearer). */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-star-market-mine", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const items = await db.marketplaceListing.findMany({
    where: { sellerId: auth.user.id, status: { not: "REMOVED" } },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      priceAmount: true,
      currency: true,
      stock: true,
      salesCount: true,
      coverUrl: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    items: items.map((i) => ({
      ...i,
      updatedAt: i.updatedAt.toISOString(),
    })),
  });
}
