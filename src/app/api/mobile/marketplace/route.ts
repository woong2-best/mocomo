import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId, requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getUsedListings } from "@/actions/used-market";
import { listingImages } from "@/lib/used-market";
import {
  createMobileUsedListing,
  listMobileMyUsedListings,
} from "@/lib/used-market-mobile";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-list", 60);
  if (limited) return limited;

  const mine = req.nextUrl.searchParams.get("mine") === "1";
  if (mine) {
    const auth = await requireMobileApiUser(req);
    if ("error" in auth) return auth.error;
    const items = await listMobileMyUsedListings(auth.user.id);
    return NextResponse.json({ items });
  }

  await getMobileUserId(req);
  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "24") || 24, 48);

  const listings = await getUsedListings({ status: "SELLING", take, q });
  const items = listings.map((l) => {
    const images = listingImages(l.images);
    return {
      id: l.id,
      title: l.title,
      price: l.price,
      thumbnailUrl: images[0] ?? null,
      region: l.region,
      status: l.status,
      saleType: l.saleType,
      createdAt: l.createdAt.toISOString(),
      favoriteCount: l._count?.favorites ?? 0,
      auctionEndsAt: l.auctionEndsAt?.toISOString() ?? null,
      currentBidAmount: l.currentBidAmount ?? null,
      bidCount: l.bidCount ?? null,
      workTitle: l.workTitle ?? null,
      productType: l.productType ?? null,
      seller: l.seller
        ? { id: l.seller.id, username: l.seller.username, image: l.seller.image }
        : null,
    };
  });

  return NextResponse.json({ items });
}

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(5000).default(""),
  price: z.coerce.number().min(0),
  category: z.string().min(1).max(40).default("OTHER"),
  region: z.string().min(1).max(80),
  meetPlace: z.string().max(120).optional(),
  images: z.array(z.string().min(1).max(2000)).max(10).default([]),
  saleType: z.enum(["FIXED", "AUCTION"]).optional(),
  auctionHours: z.number().int().positive().optional(),
  workTitle: z.string().max(120).optional(),
  productType: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-create", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const result = await createMobileUsedListing(auth.user.id, parsed.data);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ listingId: result.listingId });
}
