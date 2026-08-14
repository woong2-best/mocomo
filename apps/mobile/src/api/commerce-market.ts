import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { StarMarketListItem, StarMarketType } from "@/api/star-market";

export type SellAccessGate =
  | { allowed: true }
  | { allowed: false; redirectTo: "register" | "seller" };

export type MarketOrderSummary = {
  id: string;
  status: string;
  createdAt: string;
  coverUrl: string | null;
  title: string;
  itemCount: number;
};

export type MarketOrderRow = {
  id: string;
  status: string;
  subtotalAmount: number;
  shippingAmount: number;
  createdAt: string;
  title?: string;
  buyer: { username: string } | null;
  seller: { username: string } | null;
  items: { title: string; quantity: number; unitPrice: number; listingId?: string }[];
};

export type SellerOnboardingState = {
  signedIn: boolean;
  step: string;
  settlementPhase?: string | null;
  email?: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  phoneRequired: boolean;
  phone?: string | null;
  countryCode?: string;
  connectReady: boolean;
  settlementDeclared?: boolean;
  stripeConfigured?: boolean;
  isKr?: boolean;
  profile: {
    displayName: string | null;
    sellerType: string | null;
    businessName: string | null;
    businessRegNo: string | null;
    businessRepresentativeName: string | null;
    businessStartDate: string | null;
    businessVerifiedAt?: string | null;
    status: string;
    canList?: boolean;
    kycStatus?: string;
  } | null;
};

export async function fetchCommerceMarketList(opts?: {
  type?: StarMarketType;
  q?: string;
  take?: number;
}) {
  const params = new URLSearchParams();
  if (opts?.type && opts.type !== "ALL") params.set("type", opts.type);
  if (opts?.q) params.set("q", opts.q);
  if (opts?.take) params.set("take", String(opts.take));
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<{ items: StarMarketListItem[]; nextCursor: string | null }>(
    `${MobileApi.starMarket}${suffix}`
  );
}

export async function fetchMarketSellAccess() {
  return apiRequest<SellAccessGate>(MobileApi.marketSellAccess, { auth: true });
}

export async function fetchMarketOrders(role: "buyer" | "seller" = "buyer") {
  return apiRequest<{ orders: MarketOrderRow[] }>(
    `${MobileApi.marketOrders}?role=${role}`,
    { auth: true }
  );
}

export async function fetchMarketOrderSummary() {
  return apiRequest<{ orders: MarketOrderSummary[] }>(
    `${MobileApi.marketOrders}?role=buyer&summary=1`,
    { auth: true }
  );
}

export async function fetchMarketFavorites() {
  return apiRequest<{ items: StarMarketListItem[] }>(MobileApi.marketFavorites, { auth: true });
}

export async function toggleMarketFavorite(listingId: string) {
  return apiRequest<{ favorited: boolean }>(MobileApi.marketFavoriteToggle(listingId), {
    method: "POST",
    auth: true,
  });
}

export async function fetchMarketRelatedByTags(tags: string[], excludeIds: string[] = []) {
  const params = new URLSearchParams();
  if (tags.length) params.set("tags", tags.join(","));
  if (excludeIds.length) params.set("exclude", excludeIds.join(","));
  return apiRequest<{ items: StarMarketListItem[] }>(`${MobileApi.marketRelated}?${params}`);
}

export async function fetchMarketCreatorItems() {
  return apiRequest<{
    sellers: { id: string; username: string; name: string | null; image: string | null }[];
    items: StarMarketListItem[];
  }>(MobileApi.marketCreatorItems, { auth: true });
}

export async function fetchMarketSponsorAd() {
  return apiRequest<{
    event: { id: string; title: string; imageUrl: string; href: string } | null;
  }>(MobileApi.marketSponsorAd);
}

export async function fetchMyCoupons() {
  return apiRequest<{
    coupons: {
      id: string;
      code: string;
      name: string;
      benefitLabel: string;
      status: string;
      remainingBenefitKrw: number | null;
      useCount: number;
      endsAt: string | null;
    }[];
    promotions: {
      id: string;
      name: string;
      benefitLabel: string;
      status: string;
      remainingBenefitKrw: number | null;
    }[];
  }>(MobileApi.couponsMine, { auth: true });
}

export async function fetchMeProfile() {
  return apiRequest<{
    user: { username: string; name: string | null; image: string | null };
  }>(MobileApi.me, { auth: true });
}

export async function createCommerceListing(body: {
  title: string;
  description: string;
  type: "PHYSICAL" | "CUSTOM_ORDER" | "PREORDER";
  category: string;
  priceAmount: number;
  stock?: number;
  productionDays?: number;
  coverUrl?: string;
  shipToCountries?: string[];
}) {
  return apiRequest<{ listingId: string; success?: boolean; typeLabel?: string }>(MobileApi.marketListings, {
    method: "POST",
    body,
    auth: true,
  });
}

export async function fetchSellerOnboardingState() {
  return apiRequest<SellerOnboardingState>(MobileApi.marketSellerOnboarding, { auth: true });
}

export async function createMobileWebSession(redirect: string) {
  return apiRequest<{ url: string; redirect: string }>(MobileApi.webSession, {
    method: "POST",
    body: { redirect },
    auth: true,
  });
}
