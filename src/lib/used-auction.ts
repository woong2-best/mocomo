import type { UsedAuctionState, UsedSaleType } from "@prisma/client";

/** 경매 최소 입찰 단위 기본값 */
export const DEFAULT_BID_INCREMENT = 1_000;

/** 마감 직전 입찰 시 최대 연장 횟수 (회당 antiSnipeMinutes) */
export const MAX_ANTI_SNIPE_EXTENSIONS = 5;

export const AUCTION_DURATION_OPTIONS = [
  { hours: 1, label: "1시간" },
  { hours: 6, label: "6시간" },
  { hours: 12, label: "12시간" },
  { hours: 24, label: "1일" },
  { hours: 72, label: "3일" },
  { hours: 168, label: "7일" },
] as const;

export const BID_INCREMENT_PRESETS = [
  { value: 500, label: "500원" },
  { value: 1_000, label: "1,000원" },
  { value: 5_000, label: "5,000원" },
  { value: 10_000, label: "1만 원" },
  { value: 50_000, label: "5만 원" },
  { value: 100_000, label: "10만 원" },
] as const;

export type AuctionListingSlice = {
  saleType: UsedSaleType;
  price: number;
  auctionEndsAt: Date | string | null;
  bidIncrement: number | null;
  buyNowPrice: number | null;
  reservePrice: number | null;
  currentBidAmount: number | null;
  currentBidderId: string | null;
  auctionState: UsedAuctionState | null;
  bidCount: number;
  antiSnipeMinutes: number;
  auctionExtensionCount?: number;
  status: string;
};

export function isAuctionListing(l: { saleType?: string | null }): boolean {
  return l.saleType === "AUCTION";
}

export function auctionEndsAtMs(endsAt: Date | string | null | undefined): number | null {
  if (!endsAt) return null;
  const ms = typeof endsAt === "string" ? new Date(endsAt).getTime() : endsAt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** 경매가 아직 진행 중인지 (시간 + 상태) */
export function isAuctionLive(l: AuctionListingSlice, now = Date.now()): boolean {
  if (!isAuctionListing(l)) return false;
  if (l.status !== "SELLING") return false;
  if (l.auctionState === "CANCELLED" || l.auctionState === "ENDED") return false;
  const end = auctionEndsAtMs(l.auctionEndsAt);
  if (!end) return false;
  return end > now;
}

export function displayAuctionPrice(l: AuctionListingSlice): number {
  return l.currentBidAmount ?? l.price;
}

export function minNextBidAmount(l: AuctionListingSlice): number {
  const inc = l.bidIncrement ?? DEFAULT_BID_INCREMENT;
  const current = l.currentBidAmount;
  if (current == null) return l.price;
  return current + inc;
}

export function formatAuctionCountdown(endsAt: Date | string, now = Date.now()): string {
  const end = auctionEndsAtMs(endsAt);
  if (!end) return "—";
  const diff = end - now;
  if (diff <= 0) return "마감";
  const secs = Math.floor(diff / 1000);
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${mins}분`;
  if (mins > 0) return `${mins}분 ${s}초`;
  return `${s}초`;
}

export function auctionStateLabel(state: UsedAuctionState | null | undefined): string {
  if (state === "LIVE") return "경매 진행중";
  if (state === "ENDED") return "경매 종료";
  if (state === "CANCELLED") return "경매 취소";
  return "";
}

export function computeAuctionEndsAt(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/** 입찰 시 마감 연장 여부 (연장 횟수 한도 적용) */
export function extendedAuctionEndsAt(
  currentEndsAt: Date,
  antiSnipeMinutes: number,
  extensionCount = 0,
  maxExtensions = MAX_ANTI_SNIPE_EXTENSIONS,
  now = Date.now()
): Date | null {
  if (extensionCount >= maxExtensions) return null;
  const windowMs = antiSnipeMinutes * 60 * 1000;
  const remaining = currentEndsAt.getTime() - now;
  if (remaining > 0 && remaining <= windowMs) {
    return new Date(currentEndsAt.getTime() + windowMs);
  }
  return null;
}

export function antiSnipeExtensionsRemaining(extensionCount = 0): number {
  return Math.max(0, MAX_ANTI_SNIPE_EXTENSIONS - extensionCount);
}

export function reserveMet(
  finalBid: number | null,
  reservePrice: number | null | undefined
): boolean {
  if (finalBid == null) return false;
  if (reservePrice == null || reservePrice <= 0) return true;
  return finalBid >= reservePrice;
}

export function maskBidderName(username: string): string {
  if (username.length <= 2) return `${username[0]}*`;
  return `${username.slice(0, 2)}${"*".repeat(Math.min(4, username.length - 2))}`;
}
