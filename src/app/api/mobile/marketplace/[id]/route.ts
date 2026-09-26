import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId, requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getUsedListing } from "@/actions/used-market";
import {
  deleteMobileUsedListing,
  updateMobileUsedListing,
} from "@/lib/used-market-mobile";
import { coerceSubcultureListingFields } from "@/lib/subculture-commerce/types";
import { z } from "zod";
import { listingImages } from "@/lib/used-market";
import { isAuctionLive, minNextBidAmount } from "@/lib/used-auction";
import { geocodeMeetQuery } from "@/lib/maps/geocode";
import { meetExternalMapUrl, meetMapCaption } from "@/lib/maps/external-url";
import { normalizeMeetCountry, selectMapEngine } from "@/lib/maps/select-engine";
import { getRegionMapCenter, isShippingOnlyRegion } from "@/lib/used-region-coords";
import { canViewNsfwResource } from "@/lib/nsfw-viewer-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-detail", 60);
  if (limited) return limited;

  const viewerId = await getMobileUserId(req);
  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await getUsedListing(id, viewerId ?? undefined);
  if (!result?.listing) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다." }, { status: 404 });
  }

  const listing = result.listing;
  if (
    listing.isNsfw &&
    !(await canViewNsfwResource({
      viewerId,
      ownerId: listing.sellerId,
      isNsfw: true,
    }))
  ) {
    return NextResponse.json({ error: "성인 콘텐츠는 열람할 수 없습니다." }, { status: 403 });
  }

  const images = listingImages(listing.images);
  const auctionLive = isAuctionLive(listing);

  const meetPlace =
    typeof listing.meetPlace === "string" && listing.meetPlace.trim()
      ? listing.meetPlace.trim()
      : null;
  let meetLat =
    typeof listing.meetLat === "number" && Number.isFinite(listing.meetLat)
      ? listing.meetLat
      : null;
  let meetLng =
    typeof listing.meetLng === "number" && Number.isFinite(listing.meetLng)
      ? listing.meetLng
      : null;
  const meetCountry = normalizeMeetCountry(
    listing.meetCountry ??
      (listing.seller as { countryCode?: string } | null | undefined)?.countryCode
  );

  if ((meetLat == null || meetLng == null) && meetPlace) {
    try {
      const geo = await geocodeMeetQuery({
        country: meetCountry,
        region: listing.region,
        place: meetPlace,
      });
      if (geo) {
        meetLat = geo.lat;
        meetLng = geo.lng;
      }
    } catch {
      /* keep null */
    }
  }

  let map: {
    label: string;
    lat: number;
    lng: number;
    hasPin: boolean;
    country: string;
    engine: string;
    externalMapUrl: string;
    caption: string;
  } | null = null;

  try {
    const shipping = isShippingOnlyRegion(listing.region ?? "");
    const regionCenter = getRegionMapCenter(listing.region || "서울");
    const hasPin = meetLat != null && meetLng != null;
    const showMap = hasPin || (!shipping && !!listing.region);
    if (showMap) {
      const mapLat = hasPin ? meetLat! : regionCenter.lat;
      const mapLng = hasPin ? meetLng! : regionCenter.lng;
      const mapLabel = meetPlace || listing.region || "거래 장소";
      const coords = hasPin ? { lat: meetLat!, lng: meetLng! } : null;
      const externalMapUrl = meetExternalMapUrl({
        country: meetCountry,
        region: listing.region || mapLabel,
        place: meetPlace,
        coords,
      });
      map = {
        label: mapLabel,
        lat: mapLat,
        lng: mapLng,
        hasPin,
        country: meetCountry,
        engine: selectMapEngine(meetCountry),
        externalMapUrl,
        caption: meetMapCaption({
          country: meetCountry,
          region: listing.region,
          hasPin,
        }),
      };
    }
  } catch {
    map = null;
  }

  return NextResponse.json({
    item: {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      currency: listing.currency,
      images,
      region: listing.region,
      meetPlace,
      meetLat,
      meetLng,
      meetCountry,
      map,
      status: listing.status,
      saleType: listing.saleType,
      createdAt: listing.createdAt.toISOString(),
      favoriteCount: result.favoriteCount ?? listing._count?.favorites ?? 0,
      favorited: result.favorited ?? false,
      buyerChatRoomId: result.buyerChatRoomId ?? null,
      auctionEndsAt: listing.auctionEndsAt?.toISOString() ?? null,
      currentBidAmount: listing.currentBidAmount ?? null,
      bidCount: listing.bidCount ?? null,
      bidIncrement: listing.bidIncrement ?? null,
      buyNowPrice: listing.buyNowPrice ?? null,
      auctionState: listing.auctionState ?? null,
      auctionLive,
      minNextBid: auctionLive ? minNextBidAmount(listing) : null,
      workTitle: listing.workTitle ?? null,
      animeSlug: listing.animeSlug ?? null,
      productType: listing.productType ?? null,
      characterName: listing.characterName ?? null,
      conditionGrade: listing.conditionGrade ?? null,
      limitedKind: listing.limitedKind ?? null,
      listingFormat: listing.listingFormat ?? null,
      tradeMode: listing.tradeMode ?? null,
      subcultureMeta: listing.subcultureMeta ?? null,
      seller: listing.seller
        ? {
            id: listing.seller.id,
            username: listing.seller.username,
            image: listing.seller.image,
            name: listing.seller.name,
          }
        : null,
      isOwner: viewerId ? listing.sellerId === viewerId : false,
      winningBidderId: listing.winningBidderId ?? listing.currentBidderId ?? null,
      isWinningBidder: viewerId
        ? (listing.winningBidderId ?? listing.currentBidderId) === viewerId
        : false,
      sellerTradeConfirmed: !!listing.sellerTradeConfirmedAt,
      buyerTradeConfirmed: !!listing.buyerTradeConfirmedAt,
      isNsfw: listing.isNsfw,
      editLocked: listing.status !== "SELLING",
    },
  });
}

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(5000).optional(),
  price: z.coerce.number().min(0).optional(),
  currency: z
    .enum(["krw", "usd", "jpy", "eur", "gbp", "twd", "cny", "hkd", "sgd", "aud", "cad", "thb"])
    .optional(),
  region: z.string().min(1).max(80).optional(),
  meetPlace: z.string().max(200).optional(),
  meetLat: z.number().finite().optional(),
  meetLng: z.number().finite().optional(),
  meetCountry: z.string().length(2).optional(),
  images: z.array(z.string().min(1).max(2000)).max(10).optional(),
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-update", 30);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
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
    workTitle,
    animeSlug,
    productType,
    ...core
  } = parsed.data;

  const result = await updateMobileUsedListing(auth.user.id, id, {
    ...core,
    workTitle,
    animeSlug,
    productType,
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
  return NextResponse.json(result);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-delete", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await deleteMobileUsedListing(auth.user.id, id);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
