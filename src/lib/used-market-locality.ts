import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { COUNTRY_COOKIE } from "@/lib/i18n/config";
import { getSidoRegionPrefix, parseUsedRegion, USED_SHIPPING_REGION } from "@/lib/korea-regions";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import {
  defaultUsedRegionForCountry,
  isKoreaUsedMarketCountry,
  isUsedShippingRegion,
  normalizeUsedMarketCountry,
  USED_GLOBAL_SHIPPING_REGION,
} from "@/lib/used-regions-global";

export const CROSS_BORDER_BLOCKED_MSG =
  "국가 간 거래는 지원하지 않습니다. 본인이 설정한 국가의 이웃과만 거래할 수 있습니다.";

export const OUT_OF_SERVICE_AREA_MSG =
  "본인 서비스 지역 밖의 상품입니다. 지정한 동네 이웃과만 거래할 수 있습니다.";

export type UsedMarketLocality = {
  countryCode: string;
  /** Logged-in user's designated neighborhood; null = country-wide browse (guests) */
  serviceRegion: string | null;
};

export type UsedListingLocalitySlice = {
  meetCountry: string | null;
  region: string;
  sellerId: string;
};

const SHIPPING_REGIONS = [
  USED_SHIPPING_REGION,
  USED_GLOBAL_SHIPPING_REGION,
  "Shipping worldwide",
  "全国配送",
  "全国配送（邮寄）",
];

export async function resolveUsedMarketLocality(
  viewerId?: string | null,
  guestCountryCode?: string | null
): Promise<UsedMarketLocality> {
  if (viewerId) {
    try {
      const user = await db.user.findUnique({
        where: { id: viewerId },
        select: { countryCode: true, usedServiceRegion: true },
      });
      if (user) {
        const countryCode = normalizeUsedMarketCountry(user.countryCode);
        const serviceRegion = user.usedServiceRegion?.trim() || null;
        return { countryCode, serviceRegion };
      }
    } catch {
      /* column may be missing during rollout */
    }
  }

  let country = guestCountryCode?.trim().toUpperCase();
  if (!country) {
    try {
      const cookieStore = await cookies();
      country = cookieStore.get(COUNTRY_COOKIE)?.value?.trim().toUpperCase();
    } catch {
      /* outside request context */
    }
  }

  return {
    countryCode: normalizeUsedMarketCountry(country),
    serviceRegion: null,
  };
}

function normalizeRegionKey(region: string): string {
  return region.trim().toLowerCase();
}

export function isListingInServiceArea(
  listingRegion: string,
  serviceRegion: string,
  countryCode: string
): boolean {
  const listing = listingRegion.trim();
  const service = serviceRegion.trim();
  if (!listing || !service) return false;

  if (isUsedShippingRegion(service)) {
    return isUsedShippingRegion(listing);
  }
  if (isUsedShippingRegion(listing)) {
    return false;
  }

  if (isKoreaUsedMarketCountry(countryCode)) {
    const listingParsed = parseUsedRegion(listing);
    const serviceParsed = parseUsedRegion(service);
    if (listingParsed && serviceParsed) {
      if (serviceParsed.sidoId === "__shipping__") return false;
      return (
        listingParsed.sidoId === serviceParsed.sidoId &&
        listingParsed.sigungu === serviceParsed.sigungu
      );
    }
    return normalizeRegionKey(listing) === normalizeRegionKey(service);
  }

  const a = normalizeRegionKey(listing);
  const b = normalizeRegionKey(service);
  return a === b || a.includes(b) || b.includes(a);
}

export function buildServiceRegionWhere(
  serviceRegion: string,
  countryCode: string
): Prisma.UsedListingWhereInput {
  const region = serviceRegion.trim();
  if (isUsedShippingRegion(region)) {
    return { region: { in: SHIPPING_REGIONS } };
  }

  if (isKoreaUsedMarketCountry(countryCode)) {
    const parsed = parseUsedRegion(region);
    if (parsed && parsed.sidoId !== "__shipping__") {
      return { region };
    }
  }

  return { region: { equals: region, mode: "insensitive" } };
}

function serviceRegionAllowsSido(
  serviceRegion: string,
  sidoId: string,
  countryCode: string
): boolean {
  if (!isKoreaUsedMarketCountry(countryCode)) return false;
  if (sidoId === "__shipping__") return isUsedShippingRegion(serviceRegion);
  const parsed = parseUsedRegion(serviceRegion);
  return parsed?.sidoId === sidoId;
}

export function buildUsedListingLocalityWhere(
  locality: UsedMarketLocality,
  params?: { region?: string; sido?: string }
): Prisma.UsedListingWhereInput {
  const and: Prisma.UsedListingWhereInput[] = [
    {
      OR: [
        { meetCountry: locality.countryCode },
        { meetCountry: null, seller: { countryCode: locality.countryCode } },
      ],
    },
  ];

  if (locality.serviceRegion) {
    and.push(buildServiceRegionWhere(locality.serviceRegion, locality.countryCode));
  }

  if (params?.sido) {
    if (locality.serviceRegion) {
      if (serviceRegionAllowsSido(locality.serviceRegion, params.sido, locality.countryCode)) {
        if (params.sido === "__shipping__") {
          and.push({ region: USED_SHIPPING_REGION });
        } else {
          const prefix = getSidoRegionPrefix(params.sido);
          if (prefix) and.push({ region: { startsWith: prefix } });
        }
      }
    } else if (params.sido === "__shipping__") {
      and.push({ region: USED_SHIPPING_REGION });
    } else {
      const prefix = getSidoRegionPrefix(params.sido);
      if (prefix) and.push({ region: { startsWith: prefix } });
    }
  } else if (params?.region?.trim()) {
    const region = params.region.trim();
    if (
      !locality.serviceRegion ||
      isListingInServiceArea(region, locality.serviceRegion, locality.countryCode)
    ) {
      and.push({ region });
    }
  }

  return and.length === 1 ? and[0]! : { AND: and };
}

export function assertUsedListingVisible(
  viewerLocality: UsedMarketLocality,
  listing: UsedListingLocalitySlice,
  viewerId?: string | null
): string | null {
  if (viewerId && listing.sellerId === viewerId) return null;

  const listingCountry = normalizeMeetCountry(listing.meetCountry ?? viewerLocality.countryCode);
  if (listingCountry !== viewerLocality.countryCode) {
    return CROSS_BORDER_BLOCKED_MSG;
  }

  if (
    viewerLocality.serviceRegion &&
    !isListingInServiceArea(listing.region, viewerLocality.serviceRegion, viewerLocality.countryCode)
  ) {
    return OUT_OF_SERVICE_AREA_MSG;
  }

  return null;
}

export function assertUsedListingTradeAllowed(
  viewerLocality: UsedMarketLocality,
  listing: UsedListingLocalitySlice,
  viewerId: string
): string | null {
  return assertUsedListingVisible(viewerLocality, listing, viewerId);
}

export function assertSellerListingRegion(
  sellerCountryCode: string,
  sellerServiceRegion: string,
  listingRegion: string
): string | null {
  const countryCode = normalizeUsedMarketCountry(sellerCountryCode);
  if (!isListingInServiceArea(listingRegion, sellerServiceRegion, countryCode)) {
    return "본인 서비스 지역 내에서만 판매 글을 등록할 수 있습니다.";
  }
  return null;
}

export function lockMeetCountryToSeller(sellerCountryCode: string, clientMeetCountry?: string | null): string {
  const sellerCountry = normalizeUsedMarketCountry(sellerCountryCode);
  if (clientMeetCountry) {
    const client = normalizeMeetCountry(clientMeetCountry);
    if (client !== sellerCountry) {
      return sellerCountry;
    }
  }
  return sellerCountry;
}
