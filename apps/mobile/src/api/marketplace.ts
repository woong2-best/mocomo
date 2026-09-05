import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type MarketplaceListItem = {
  id: string;
  title: string;
  price: number;
  currency?: string | null;
  thumbnailUrl: string | null;
  region: string | null;
  status: string;
  saleType: string;
  createdAt: string;
  favoriteCount: number;
  auctionEndsAt: string | null;
  currentBidAmount: number | null;
  bidCount: number | null;
  workTitle: string | null;
  productType: string | null;
  isNsfw?: boolean;
  sellerId?: string;
  seller: { id: string; username: string; image: string | null } | null;
};

export type MarketplaceMeetMap = {
  label: string;
  lat: number;
  lng: number;
  hasPin: boolean;
  country?: string;
  engine?: string;
  externalMapUrl?: string;
  /** @deprecated use externalMapUrl */
  kakaoMapUrl?: string;
  caption: string;
};

export type MarketplaceDetail = Omit<MarketplaceListItem, "thumbnailUrl"> & {
  description: string;
  images: string[];
  favorited: boolean;
  buyerChatRoomId: string | null;
  bidIncrement: number | null;
  buyNowPrice: number | null;
  auctionState: string | null;
  auctionLive: boolean;
  minNextBid: number | null;
  isOwner: boolean;
  isNsfw?: boolean;
  sellerId?: string;
  meetPlace?: string | null;
  meetLat?: number | null;
  meetLng?: number | null;
  meetCountry?: string | null;
  map?: MarketplaceMeetMap | null;
  animeSlug?: string | null;
  characterName?: string | null;
  conditionGrade?: string | null;
  limitedKind?: string | null;
  listingFormat?: string | null;
  tradeMode?: string | null;
  subcultureMeta?: unknown;
  seller: {
    id: string;
    username: string;
    image: string | null;
    name: string | null;
  } | null;
};

export type MarketplaceListQuery = {
  q?: string;
  category?: string;
  sido?: string;
  region?: string;
  work?: string;
  product?: string;
  mode?: "auction" | "all";
  mine?: boolean;
  take?: number;
};

export async function fetchMarketplaceList(query: MarketplaceListQuery | string = {}) {
  const params = new URLSearchParams();
  if (typeof query === "string") {
    if (query) params.set("q", query);
  } else {
    if (query.q) params.set("q", query.q);
    if (query.category) params.set("category", query.category);
    if (query.sido) params.set("sido", query.sido);
    if (query.region) params.set("region", query.region);
    if (query.work) params.set("work", query.work);
    if (query.product) params.set("product", query.product);
    if (query.mode === "auction") params.set("mode", "auction");
    if (query.mine) params.set("mine", "1");
    if (query.take) params.set("take", String(query.take));
  }
  const suffix = params.toString() ? `?${params}` : "";
  return apiRequest<{ items: MarketplaceListItem[] }>(`${MobileApi.marketplace}${suffix}`, {
    auth: true,
  });
}

export async function createMarketplaceListing(body: {
  title: string;
  description: string;
  price: number;
  currency?: string;
  category: string;
  region: string;
  meetPlace?: string;
  meetLat?: number;
  meetLng?: number;
  meetCountry?: string;
  images: string[];
  saleType?: "FIXED" | "AUCTION";
  auctionHours?: number;
  workTitle?: string;
  animeSlug?: string;
  productType?: string;
  characterName?: string;
  conditionGrade?: string;
  limitedKind?: string;
  listingFormat?: string;
  tradeMode?: string;
  isNsfw?: boolean;
}) {
  return apiRequest<{ listingId: string }>(MobileApi.marketplace, {
    method: "POST",
    body,
  });
}

export async function fetchStarMarketMine() {
  return apiRequest<{
    items: {
      id: string;
      title: string;
      type: string;
      status: string;
      priceAmount: number;
      currency: string;
      stock: number | null;
      salesCount: number;
      coverUrl: string | null;
      updatedAt: string;
    }[];
  }>(MobileApi.starMarketMine, { auth: true });
}

export async function fetchMarketplaceDetail(id: string) {
  return apiRequest<{ item: MarketplaceDetail }>(`${MobileApi.marketplace}/${id}`, {
    auth: true,
  });
}

export async function toggleMarketplaceFavorite(id: string) {
  return apiRequest<{ favorited: boolean }>(`${MobileApi.marketplace}/${id}/favorite`, {
    method: "POST",
  });
}

export async function startMarketplaceTradeChat(id: string) {
  return apiRequest<{ roomId: string }>(`${MobileApi.marketplace}/${id}/trade-chat`, {
    method: "POST",
    body: {},
  });
}

export async function placeMarketplaceBid(
  id: string,
  amount: number,
  opts?: { termsAccepted?: boolean; paymentIntentDbId?: string }
) {
  return apiRequest<{
    success?: boolean;
    amount?: number;
    extended?: boolean;
    error?: string;
    needsBidHold?: boolean;
    needsAdultVerify?: boolean;
  }>(`${MobileApi.marketplace}/${id}/bid`, {
    method: "POST",
    body: {
      amount,
      termsAccepted: opts?.termsAccepted ?? true,
      paymentIntentDbId: opts?.paymentIntentDbId,
    },
  });
}

export async function prepareMarketplaceBidHold(id: string, amount: number) {
  return apiRequest<{
    orderId: string;
    clientSecret: string;
    publishableKey: string;
    holdAmount: number;
    bidAmount: number;
    methods: Array<{
      id: string;
      brand: string;
      last4: string;
      expMonth: number;
      expYear: number;
      isDefault: boolean;
    }>;
  }>(`${MobileApi.marketplace}/${id}/bid`, {
    method: "POST",
    body: { mode: "prepare", amount },
  });
}

export async function payMarketplaceBidHold(
  id: string,
  paymentIntentDbId: string,
  paymentMethodId: string
) {
  return apiRequest<{
    ok?: boolean;
    requiresAction?: boolean;
    clientSecret?: string;
    orderId?: string;
    error?: string;
  }>(`${MobileApi.marketplace}/${id}/bid`, {
    method: "POST",
    body: { mode: "pay", paymentIntentDbId, paymentMethodId },
  });
}

export type UsedBankStatus = {
  countryCode: string;
  bankVerified: boolean;
  emailVerified?: boolean;
  displayAccount: string | null;
  eligible: boolean;
  usedMarketEligible?: boolean;
  legalName?: string | null;
};

export async function fetchAccountBankStatus() {
  return apiRequest<UsedBankStatus>(MobileApi.accountBank, { auth: true });
}

export async function sendAccountBankVerification(bankCode: string, accountNum: string) {
  return apiRequest<{
    message?: string;
    alreadyVerified?: boolean;
    displayAccount?: string;
    sendsRemaining?: number;
    devCode?: string;
  }>(MobileApi.accountBank, {
    method: "POST",
    body: { action: "send", bankCode, accountNum },
  });
}

export async function verifyAccountBankCode(bankCode: string, accountNum: string, code: string) {
  return apiRequest<{ success: boolean; displayAccount?: string }>(MobileApi.accountBank, {
    method: "POST",
    body: { action: "verify", bankCode, accountNum, code },
  });
}

export async function fetchUsedBankStatus() {
  return apiRequest<UsedBankStatus>(MobileApi.marketplacePhone, { auth: true });
}

/** @deprecated */
export const fetchUsedPhoneStatus = fetchUsedBankStatus;

export async function sendUsedBankVerification(bankCode: string, accountNum: string) {
  return apiRequest<{
    message?: string;
    alreadyVerified?: boolean;
    displayAccount?: string;
    sendsRemaining?: number;
    devCode?: string;
  }>(MobileApi.marketplacePhone, {
    method: "POST",
    body: { action: "send", bankCode, accountNum },
  });
}

export async function verifyUsedBankCode(bankCode: string, accountNum: string, code: string) {
  return apiRequest<{ success: boolean; displayAccount?: string }>(MobileApi.marketplacePhone, {
    method: "POST",
    body: { action: "verify", bankCode, accountNum, code },
  });
}

export async function sendUsedPhoneOtp(phone: string) {
  return apiRequest<{
    message?: string;
    alreadyVerified?: boolean;
    phoneDisplay?: string;
    devCode?: string;
  }>(MobileApi.marketplacePhone, {
    method: "POST",
    body: { action: "send", phone },
  });
}

export async function verifyUsedPhoneOtp(phone: string, code: string) {
  return apiRequest<{ success: boolean; displayPhone?: string }>(MobileApi.marketplacePhone, {
    method: "POST",
    body: { action: "verify", phone, code },
  });
}

/** @deprecated */
export const sendUsedPhoneOtpLegacy = (_phone: string) =>
  sendUsedBankVerification("004", _phone);
