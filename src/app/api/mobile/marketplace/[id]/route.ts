import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getUsedListing } from "@/actions/used-market";
import { listingImages, usedMapSearchUrl } from "@/lib/used-market";
import { isAuctionLive, minNextBidAmount } from "@/lib/used-auction";
import { isKakaoLocalConfigured, kakaoGeocodeMeetPlace } from "@/lib/kakao-local";
import { getRegionMapCenter, isShippingOnlyRegion } from "@/lib/used-region-coords";

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

  if (
    (meetLat == null || meetLng == null) &&
    meetPlace &&
    isKakaoLocalConfigured()
  ) {
    try {
      const geo = await kakaoGeocodeMeetPlace(listing.region, meetPlace);
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
    kakaoMapUrl: string;
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
      map = {
        label: mapLabel,
        lat: mapLat,
        lng: mapLng,
        hasPin,
        kakaoMapUrl: usedMapSearchUrl(
          listing.region || mapLabel,
          meetPlace,
          hasPin ? { lat: meetLat!, lng: meetLng! } : null
        ),
        caption: hasPin
          ? `${listing.region} 인근 직거래 · 카카오 로컬 API로 표시된 만남 위치입니다`
          : `${listing.region} 인근 · 정확한 만남 핀이 없어 지역 중심으로 표시합니다`,
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
      images,
      region: listing.region,
      meetPlace,
      meetLat,
      meetLng,
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
      productType: listing.productType ?? null,
      seller: listing.seller
        ? {
            id: listing.seller.id,
            username: listing.seller.username,
            image: listing.seller.image,
            name: listing.seller.name,
          }
        : null,
      isOwner: viewerId ? listing.sellerId === viewerId : false,
    },
  });
}
