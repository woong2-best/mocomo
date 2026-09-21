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
  cursor?: string | null;
  mode?: "discover" | "latest";
}) {
  const params = new URLSearchParams();
  if (opts?.type && opts.type !== "ALL") params.set("type", opts.type);
  if (opts?.q) params.set("q", opts.q);
  if (opts?.take) params.set("take", String(opts.take));
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.mode) params.set("mode", opts.mode);
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<{ items: StarMarketListItem[]; nextCursor: string | null }>(
    `${MobileApi.starMarket}${suffix}`
  );
}

export async function fetchMarketSellAccess() {
  return apiRequest<SellAccessGate>(MobileApi.marketSellAccess, { auth: true });
}

export type MarketOrderDetail = {
  id: string;
  status: string;
  checkoutMode: string;
  subtotalAmount: number;
  shippingAmount: number;
  platformFeeAmount: number;
  currency: string;
  createdAt: string;
  shipName: string | null;
  shipCountry: string | null;
  shipPostal: string | null;
  shipAddress1: string | null;
  shipAddress2: string | null;
  shipPhone: string | null;
  buyerNote: string | null;
  isBuyer: boolean;
  isSeller: boolean;
  buyer: { id: string; username: string; email?: string | null } | null;
  seller: { id: string; username: string } | null;
  items: {
    id: string;
    listingId: string;
    titleSnapshot: string;
    unitPrice: number;
    quantity: number;
    listingType: string;
  }[];
  shipment: {
    status: string;
    carrier: string | null;
    trackingNumber: string | null;
    updatedAt: string;
  } | null;
  downloads: { id: string; fileUrl: string; downloadToken: string }[];
};

export type CartCheckoutGroup = {
  sellerId: string;
  sellerDisplayName: string;
  itemCount: number;
  subtotal: number;
  shippingAmount: number;
  total: number;
  lines: { listingId: string; title: string; quantity: number; unitPrice: number }[];
};

export async function fetchMarketCartSummary(items: { listingId: string; quantity: number }[]) {
  return apiRequest<{
    checkoutMode: string;
    disclaimer: string;
    blocked?: boolean;
    groups: CartCheckoutGroup[];
  }>(MobileApi.marketCartSummary, {
    method: "POST",
    body: { items },
    auth: true,
  });
}

export async function prepareCartCheckout(
  sellerId: string,
  body: {
    items: { listingId: string; quantity: number }[];
    shipName?: string;
    shipCountry?: string;
    shipPostal?: string;
    shipAddress1?: string;
    shipAddress2?: string;
    shipPhone?: string;
    buyerNote?: string;
  }
) {
  return apiRequest<import("@/api/star-market").PrepareMarketplaceResult>(
    MobileApi.marketCartCheckout,
    { method: "POST", body: { sellerId, ...body }, auth: true }
  );
}

export async function fetchMarketOrderDetail(orderId: string) {
  return apiRequest<{ order: MarketOrderDetail }>(MobileApi.marketOrderDetail(orderId), {
    auth: true,
  });
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
  isNsfw?: boolean;
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
