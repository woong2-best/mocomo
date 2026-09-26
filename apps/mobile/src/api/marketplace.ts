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
  winningBidderId?: string | null;
  isWinningBidder?: boolean;
  sellerTradeConfirmed?: boolean;
  buyerTradeConfirmed?: boolean;
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
  condition?: string;
  limited?: string;
  trade?: string;
  mode?: "auction" | "fixed";
  lane?: "all" | "recommend" | "purchased" | "favorites" | "live-auctions" | "disputes";
  ids?: string[];
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
    if (query.condition) params.set("condition", query.condition);
    if (query.limited) params.set("limited", query.limited);
    if (query.trade) params.set("trade", query.trade);
    if (query.mode === "auction" || query.mode === "fixed") params.set("mode", query.mode);
    if (query.lane) params.set("lane", query.lane);
    if (query.ids?.length) params.set("ids", query.ids.slice(0, 24).join(","));
    if (query.mine) params.set("mine", "1");
    if (query.take) params.set("take", String(query.take));
  }
  const suffix = params.toString() ? `?${params}` : "";
  const path = `${MobileApi.marketplace}${suffix}`;

  // Browse is public — send token when present, but never hard-fail auth for listing.
  try {
    const res = await apiRequest<{ items: MarketplaceListItem[] }>(path, { auth: true });
    return { items: Array.isArray(res?.items) ? res.items.filter((i) => i?.id) : [] };
  } catch (err) {
    if (query && typeof query !== "string" && query.mine) throw err;
    try {
      const res = await apiRequest<{ items: MarketplaceListItem[] }>(path, { auth: false });
      return { items: Array.isArray(res?.items) ? res.items.filter((i) => i?.id) : [] };
    } catch {
      throw err;
    }
  }
}

export async function createMarketplaceListing(body: {
  title: string;
  description: string;
  price: number;
  currency?: string;
  category?: string;
  categories?: string[];
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

export async function confirmAuctionTrade(listingId: string) {
  return apiRequest<{
    success: true;
    completed: boolean;
    sellerConfirmed: boolean;
    buyerConfirmed: boolean;
  }>(MobileApi.marketplaceTradeComplete(listingId), { method: "POST" });
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

export async function deleteMarketplaceListing(id: string) {
  return apiRequest<{ success: true }>(`${MobileApi.marketplace}/${id}`, {
    method: "DELETE",
  });
}

export async function bumpMarketplaceListing(id: string) {
  return apiRequest<{ success: true; bumpedAt: string }>(MobileApi.marketplaceBump(id), {
    method: "POST",
    body: {},
  });
}

export async function updateMarketplaceListing(
  id: string,
  body: Parameters<typeof createMarketplaceListing>[0]
) {
  return apiRequest<{ success: true; listingId: string }>(`${MobileApi.marketplace}/${id}`, {
    method: "PATCH",
    body,
  });
}

export async function requestUsedTrade(listingId: string, roomId: string, meetAt: string) {
  return apiRequest<{ requestId: string; status: string }>(
    MobileApi.marketplaceTradeRequest(listingId),
    { method: "POST", body: { roomId, meetAt } }
  );
}

export type UsedMeetPin = {
  id: string;
  listingId: string;
  lat: number;
  lng: number;
  title: string;
  place: string;
  price: string;
  image: string | null;
  meetAt: string | null;
  confirmed: boolean;
};

export async function fetchUsedMeetPins() {
  return apiRequest<{ pins: UsedMeetPin[] }>(MobileApi.marketplaceMeetPins);
}

export type UsedTradeRequestDetail = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingStatus: string;
  roomId: string;
  buyerId: string;
  sellerId: string;
  buyerUsername: string;
  sellerUsername: string;
  requestedById?: string | null;
  meetAt?: string | null;
  canRespond?: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  respondedAt: string | null;
};

export async function fetchUsedTradeRequest(requestId: string) {
  return apiRequest<{ request: UsedTradeRequestDetail }>(
    MobileApi.marketplaceTradeRequestDetail(requestId)
  );
}

export async function respondUsedTradeRequest(
  requestId: string,
  action: "approve" | "reject"
) {
  return apiRequest<{ status: string; listingStatus?: string }>(
    MobileApi.marketplaceTradeRequestRespond(requestId),
    { method: "POST", body: { action } }
  );
}

export async function submitUsedListingReport(params: {
  listingId: string;
  reportedUserId: string;
  reason: import("@/lib/report-taxonomy").ReportReasonId;
  reasonPath?: string;
  details?: string;
}) {
  return apiRequest<{ ok: boolean; message: string }>(MobileApi.reports, {
    method: "POST",
    body: {
      targetType: "USED_LISTING",
      targetId: params.listingId,
      reportedUserId: params.reportedUserId,
      reason: params.reason,
      reasonPath: params.reasonPath,
      details: params.details,
    },
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
  phoneVerified?: boolean;
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
