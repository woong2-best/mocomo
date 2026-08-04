import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type MarketplaceListItem = {
  id: string;
  title: string;
  price: number;
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
  meetPlace?: string | null;
  meetLat?: number | null;
  meetLng?: number | null;
  meetCountry?: string | null;
  map?: MarketplaceMeetMap | null;
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
  productType?: string;
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

export async function placeMarketplaceBid(id: string, amount: number) {
  return apiRequest<{ success: boolean; amount: number; extended?: boolean }>(
    `${MobileApi.marketplace}/${id}/bid`,
    { method: "POST", body: { amount } }
  );
}

export type UsedPhoneStatus = {
  countryCode: string;
  phone: string | null;
  phoneVerified: boolean;
  displayPhone: string | null;
  eligible: boolean;
};

export async function fetchUsedPhoneStatus() {
  return apiRequest<UsedPhoneStatus>(MobileApi.marketplacePhone, { auth: true });
}

export async function sendUsedPhoneOtp(phone: string) {
  return apiRequest<{
    message?: string;
    alreadyVerified?: boolean;
    phoneDisplay?: string;
    sendsRemaining?: number;
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
