import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId, requireMobileApiUser } from "@/lib/api-mobile-auth";
import { resolveUsedMarketBrowse, type UsedMarketBrowseMode } from "@/lib/used-ranking";
import { resolveUsedViewerCountry } from "@/lib/used-market-locale-scope";
import { listingImages } from "@/lib/used-market";
import {
  createMobileUsedListing,
  listMobileLiveAuctions,
  listMobileMyUsedListings,
  listMobileRecommendedUsed,
  listMobileUsedByIds,
  listMobileUsedDisputes,
  listMobileUsedFavorites,
  listMobileUsedPurchases,
} from "@/lib/used-market-mobile";
import { filterNsfwItems, resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";
import { coerceSubcultureListingFields } from "@/lib/subculture-commerce/types";

export async function GET(req: NextRequest) {
  const rateLimited = await rateLimitPublicApi(req, "mobile-marketplace-list", 60);
  if (rateLimited) return rateLimited;

  const mine = req.nextUrl.searchParams.get("mine") === "1";
  if (mine) {
    const auth = await requireMobileApiUser(req);
    if ("error" in auth) return auth.error;
    try {
      const mineMode = req.nextUrl.searchParams.get("mode")?.trim();
      const mineSaleType =
        mineMode === "auction" ? "AUCTION" : mineMode === "fixed" ? "FIXED" : undefined;
      const items = await listMobileMyUsedListings(auth.user.id, mineSaleType);
      return NextResponse.json({ items });
    } catch {
      return NextResponse.json({ error: "내 거래 목록을 불러오지 못했습니다." }, { status: 500 });
    }
  }

  const lane = req.nextUrl.searchParams.get("lane")?.trim() || undefined;
  const idsParam = req.nextUrl.searchParams.get("ids")?.trim() || undefined;
  if (lane === "favorites" || lane === "purchased" || lane === "live-auctions" || lane === "disputes") {
    const auth = await requireMobileApiUser(req);
    if ("error" in auth) return auth.error;
    const takeLane = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "24") || 24, 48);
    try {
      const items =
        lane === "favorites"
          ? await listMobileUsedFavorites(auth.user.id, takeLane)
          : lane === "purchased"
            ? await listMobileUsedPurchases(auth.user.id, takeLane)
            : lane === "live-auctions"
              ? await listMobileLiveAuctions(auth.user.id, takeLane)
              : await listMobileUsedDisputes(auth.user.id, takeLane);
      return NextResponse.json({ items, lane });
    } catch {
      return NextResponse.json({ error: "목록을 불러오지 못했습니다.", items: [] }, { status: 500 });
    }
  }
  if (idsParam) {
    try {
      const items = await listMobileUsedByIds(idsParam.split(","));
      return NextResponse.json({ items, lane: "ids" });
    } catch {
      return NextResponse.json({ error: "상품 목록을 불러오지 못했습니다.", items: [] }, { status: 500 });
    }
  }
  if (lane === "recommend") {
    try {
      const viewerId = await getMobileUserId(req);
      const takeLane = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "24") || 24, 48);
      const items = await listMobileRecommendedUsed(viewerId, takeLane);
      return NextResponse.json({ items, lane: "recommend" });
    } catch {
      return NextResponse.json({ error: "추천 상품을 불러오지 못했습니다.", items: [] }, { status: 500 });
    }
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const category = req.nextUrl.searchParams.get("category")?.trim() || undefined;
  const sido = req.nextUrl.searchParams.get("sido")?.trim() || undefined;
  const country = req.nextUrl.searchParams.get("country")?.trim() || undefined;
  const region = req.nextUrl.searchParams.get("region")?.trim() || undefined;
  const work = req.nextUrl.searchParams.get("work")?.trim() || undefined;
  const anime = req.nextUrl.searchParams.get("anime")?.trim() || undefined;
  const product = req.nextUrl.searchParams.get("product")?.trim() || undefined;
  const condition = req.nextUrl.searchParams.get("condition")?.trim() || undefined;
  const limitedKind = req.nextUrl.searchParams.get("limited")?.trim() || undefined;
  const trade = req.nextUrl.searchParams.get("trade")?.trim() || undefined;
  const mode = req.nextUrl.searchParams.get("mode")?.trim() || undefined;
  const modeParam = req.nextUrl.searchParams.get("mode")?.trim();
  const browseMode: UsedMarketBrowseMode =
    modeParam === "latest" || modeParam === "discover" ? modeParam : "discover";
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "24") || 24, 48);
  const cursor = req.nextUrl.searchParams.get("cursor")?.trim() || undefined;

  try {
    const viewerId = await getMobileUserId(req);
    const canViewNsfw = await resolveCanViewNsfw(viewerId);
    const viewerCountryCode = await resolveUsedViewerCountry({ userId: viewerId });

    const listings = filterNsfwItems(
      await resolveUsedMarketBrowse({
        userId: viewerId,
        viewerCountryCode,
        mode: browseMode,
        status: "SELLING",
        take,
        cursor,
        q,
        category: category && category !== "ALL" ? category : undefined,
        sido: sido || undefined,
        region: region || undefined,
        country: country || undefined,
        work: work || undefined,
        anime: anime || undefined,
        product: product || undefined,
        condition: condition || undefined,
        limited: limitedKind || undefined,
        trade: trade || undefined,
        saleType: mode === "auction" ? "AUCTION" : mode === "fixed" ? "FIXED" : undefined,
        liveAuctionOnly: mode === "auction",
      }),
      canViewNsfw
    );
    const items = listings.map((l) => {
      const images = listingImages(l.images);
      return {
        id: l.id,
        title: l.title,
        price: l.price,
        currency: l.currency,
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
        characterName: l.characterName ?? null,
        conditionGrade: l.conditionGrade ?? null,
        limitedKind: l.limitedKind ?? null,
        tradeMode: l.tradeMode ?? null,
        subcultureMeta: l.subcultureMeta ?? null,
        isNsfw: l.isNsfw,
        sellerId: l.sellerId,
        seller: l.seller
          ? { id: l.seller.id, username: l.seller.username, image: l.seller.image }
          : null,
      };
    });

    return NextResponse.json({ items, mode: browseMode }, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45",
      },
    });
  } catch {
    try {
      const viewerId = await getMobileUserId(req);
      const canViewNsfw = await resolveCanViewNsfw(viewerId);
      const viewerCountryCode = await resolveUsedViewerCountry({ userId: viewerId });
      const { getUsedListings } = await import("@/actions/used-market");
      const listings = filterNsfwItems(
        await getUsedListings(
          {
            status: "SELLING",
            take,
            q,
            category: category && category !== "ALL" ? category : undefined,
            sido: sido || undefined,
            region: region || undefined,
            work: work || undefined,
            product: product || undefined,
            condition: condition || undefined,
            limited: limitedKind || undefined,
            trade: trade || undefined,
            anime: anime || undefined,
            saleType: mode === "auction" ? "AUCTION" : mode === "fixed" ? "FIXED" : undefined,
            liveAuctionOnly: mode === "auction",
          },
          { viewerId, sessionCountry: viewerCountryCode }
        ),
        canViewNsfw
      );
      const items = listings.map((l) => {
        const images = listingImages(l.images);
        return {
          id: l.id,
          title: l.title,
          price: l.price,
          currency: l.currency,
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
          characterName: l.characterName ?? null,
          conditionGrade: l.conditionGrade ?? null,
          limitedKind: l.limitedKind ?? null,
          tradeMode: l.tradeMode ?? null,
          subcultureMeta: l.subcultureMeta ?? null,
          isNsfw: l.isNsfw,
          sellerId: l.sellerId,
          seller: l.seller
            ? { id: l.seller.id, username: l.seller.username, image: l.seller.image }
            : null,
        };
      });
      return NextResponse.json({ items, mode: browseMode, degraded: true });
    } catch {
      return NextResponse.json(
        { error: "상품 목록을 불러오지 못했습니다.", items: [] },
        { status: 500 }
      );
    }
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(5000).default(""),
  price: z.coerce.number().min(0),
  currency: z
    .enum(["krw", "usd", "jpy", "eur", "gbp", "twd", "cny", "hkd", "sgd", "aud", "cad", "thb"])
    .optional(),
  category: z.string().min(1).max(40).optional(),
  categories: z.array(z.string().min(1).max(40)).min(1).max(8).optional(),
  region: z.string().min(1).max(80),
  meetPlace: z.string().max(200).optional(),
  meetLat: z.number().finite().optional(),
  meetLng: z.number().finite().optional(),
  meetCountry: z.string().length(2).optional(),
  images: z.array(z.string().min(1).max(2000)).max(10).default([]),
  saleType: z.enum(["FIXED", "AUCTION"]).optional(),
  auctionHours: z.number().int().positive().optional(),
  workTitle: z.string().max(120).optional(),
  animeSlug: z.string().max(120).optional(),
  productType: z.string().max(40).optional(),
  characterName: z.string().max(80).optional(),
  conditionGrade: z.string().max(20).optional(),
  limitedKind: z.string().max(30).optional(),
  listingFormat: z.string().max(20).optional(),
  tradeMode: z.string().max(20).optional(),
  itemOrigin: z.string().max(30).optional(),
  packagingState: z.string().max(30).optional(),
  subcultureMeta: z.record(z.unknown()).optional(),
  isNsfw: z.boolean().optional(),
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

  const {
    characterName,
    conditionGrade,
    limitedKind,
    listingFormat,
    tradeMode,
    itemOrigin,
    packagingState,
    subcultureMeta,
    ...listingCore
  } = parsed.data;

  const result = await createMobileUsedListing(auth.user.id, {
    ...listingCore,
    ...coerceSubcultureListingFields({
      characterName,
      conditionGrade,
      limitedKind,
      listingFormat,
      tradeMode,
      itemOrigin,
      packagingState,
      subcultureMeta,
    }),
  });
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ listingId: result.listingId });
}
