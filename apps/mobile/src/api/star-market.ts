import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type StarMarketType =
  | "ALL"
  | "PHYSICAL"
  | "CUSTOM_ORDER"
  | "DIGITAL"
  | "PREORDER"
  | "EMOTICON";

export type StarMarketListItem = {
  id: string;
  title: string;
  type: string;
  category?: string | null;
  priceAmount: number;
  currency: string;
  coverUrl: string | null;
  stock?: number | null;
  productionDays?: number | null;
  favoriteCount?: number;
  salesCount?: number;
  isNsfw?: boolean;
  sellerId?: string;
  slug?: string;
  seller: {
    id: string;
    username: string;
    image: string | null;
    displayName?: string | null;
  } | null;
};

export type StarMarketDetail = {
  id: string;
  title: string;
  description: string;
  type: string;
  typeLabel: string;
  category: string | null;
  tags: string[];
  priceAmount: number;
  currency: string;
  coverUrl: string | null;
  stock: number | null;
  productionDays: number | null;
  favoriteCount: number;
  salesCount: number;
  viewCount: number;
  images: string[];
  seller: {
    id: string;
    username: string;
    image: string | null;
    name: string | null;
    displayName: string | null;
    ratingAvg: number | null;
  } | null;
  isOwner: boolean;
  isNsfw?: boolean;
  sellerId?: string;
  paymentsEnabled?: boolean;
  shipToCountries?: string[];
  shipsWorldwide?: boolean;
  shippingFeeType?: string | null;
  shippingFeeFixed?: number | null;
  createdAt: string;
  publishedAt: string | null;
};

export async function fetchStarMarketList(opts?: {
  type?: StarMarketType;
  q?: string;
  cursor?: string | null;
  take?: number;
}) {
  if (opts?.type === "EMOTICON") {
    return apiRequest<{ items: StarMarketListItem[]; nextCursor?: null }>(
      MobileApi.starMarketEmoticons,
      { auth: true }
    );
  }

  const params = new URLSearchParams();
  if (opts?.type && opts.type !== "ALL") params.set("type", opts.type);
  if (opts?.q) params.set("q", opts.q);
  if (opts?.cursor) params.set("cursor", opts.cursor);
  if (opts?.take) params.set("take", String(opts.take));
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<{ items: StarMarketListItem[]; nextCursor: string | null }>(
    `${MobileApi.starMarket}${suffix}`,
    { auth: true }
  );
}

export async function fetchStarMarketDetail(id: string) {
  return apiRequest<{ item: StarMarketDetail }>(`${MobileApi.starMarket}/${id}`, {
    auth: true,
  });
}

export type MarketplaceCheckoutBody = {
  quantity?: number;
  shipName?: string;
  shipCountry?: string;
  shipPostal?: string;
  shipAddress1?: string;
  shipAddress2?: string;
  shipPhone?: string;
  buyerNote?: string;
};

export async function createStarMarketCheckout(listingId: string, body: MarketplaceCheckoutBody) {
  return apiRequest<{ checkoutUrl: string; orderId: string; marketplaceOrderId: string }>(
    MobileApi.starMarketCheckout(listingId),
    { method: "POST", body }
  );
}

export type PrepareMarketplaceResult = {
  orderId: string;
  marketplaceOrderId: string;
  clientSecret: string | null;
  publishableKey: string;
  methods: import("@/features/wallet/wallet-card-builders").PaymentMethodItem[];
  amount: number;
  orderName: string;
};

export async function prepareMarketplacePayment(listingId: string, body: MarketplaceCheckoutBody) {
  return apiRequest<PrepareMarketplaceResult>(MobileApi.starMarketCheckout(listingId), {
    method: "POST",
    body,
    auth: true,
  });
}

export async function payMarketplaceWithSavedCard(
  listingId: string,
  orderId: string,
  paymentMethodId: string
) {
  return apiRequest<
    | { success: true; type: string; alreadyPaid?: boolean; redirectPath?: string }
    | { requiresAction: true; authenticateUrl: string; orderId: string }
    | { error: string }
  >(MobileApi.starMarketCheckout(listingId), {
    method: "PATCH",
    body: { mode: "saved", orderId, paymentMethodId },
    auth: true,
  });
}

export async function finalizeMarketplacePayment(listingId: string, orderId: string) {
  return apiRequest<{ success: true; type: string; alreadyPaid?: boolean }>(
    MobileApi.starMarketCheckout(listingId),
    {
      method: "PATCH",
      body: { mode: "finalize", orderId },
      auth: true,
    }
  );
}

export async function startMarketplaceCheckoutRedirect(listingId: string, orderId: string) {
  return apiRequest<{ checkoutUrl: string; orderId: string; marketplaceOrderId: string }>(
    MobileApi.starMarketCheckout(listingId),
    {
      method: "PATCH",
      body: { mode: "checkout", orderId },
      auth: true,
    }
  );
}
