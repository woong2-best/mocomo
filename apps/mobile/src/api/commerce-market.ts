import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import type { StarMarketListItem, StarMarketType } from "@/api/star-market";

export type SellAccessGate =
  | { allowed: true }
  | { allowed: false; redirectTo: "register" | "seller" };

export type MarketOrderRow = {
  id: string;
  status: string;
  subtotalAmount: number;
  shippingAmount: number;
  createdAt: string;
  buyer: { username: string } | null;
  seller: { username: string } | null;
  items: { title: string; quantity: number; unitPrice: number }[];
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
