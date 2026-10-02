import type { UsedAuctionState, UsedSaleType } from "@prisma/client";
import { translate } from "@/lib/i18n/messages";

/** 경매 최소 입찰 단위 기본값 (원). 달러 상품은 1달러(100센트). */
export const DEFAULT_BID_INCREMENT = 1_000;

export function defaultBidIncrement(currency?: string | null): number {
  return (currency ?? "").toLowerCase() === "usd" ? 100 : DEFAULT_BID_INCREMENT;
}

/** 마감 직전 입찰 시 최대 연장 횟수 (회당 antiSnipeMinutes) */
export const MAX_ANTI_SNIPE_EXTENSIONS = 5;

/** 모든 경매는 등록 시점부터 3일. 클라이언트가 보낸 기간은 쓰지 않는다. */
export const AUCTION_DURATION_HOURS = 72;

export const AUCTION_DURATION_OPTIONS = [
  { hours: AUCTION_DURATION_HOURS, label: "3 days" },
] as const;

export const BID_INCREMENT_PRESETS = [
  { value: 500, label: "₩500" },
  { value: 1_000, label: "₩1,000" },
  { value: 5_000, label: "₩5,000" },
  { value: 10_000, label: "₩10,000" },
  { value: 50_000, label: "₩50,000" },
  { value: 100_000, label: "₩100,000" },
] as const;

/** 저가 카드·lot 경매용 */
export const BID_INCREMENT_PRESETS_TCG_KRW = [
  { value: 100, label: "₩100" },
  { value: 500, label: "₩500" },
  { value: 1_000, label: "₩1,000" },
  { value: 5_000, label: "₩5,000" },
  { value: 10_000, label: "₩10,000" },
] as const;

export const BID_INCREMENT_PRESETS_TCG_USD = [
  { value: 10, label: "$0.10" },
  { value: 50, label: "$0.50" },
  { value: 100, label: "$1" },
  { value: 500, label: "$5" },
] as const;

export type AuctionListingSlice = {
  saleType: UsedSaleType;
  price: number;
  currency?: string | null;
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
  paymentDueAt?: Date | string | null;
  paymentCompletedAt?: Date | string | null;
  winningBidderId?: string | null;
  negotiationDueAt?: Date | string | null;
  negotiationBuyerId?: string | null;
  agreedPrice?: number | null;
  forfeitedWinnerCount?: number;
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

export type AuctionCountdownParts = {
  ended: boolean;
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  /** DD:HH:MM:SS */
  text: string;
};

function pad2(n: number): string {
  return String(Math.max(0, n)).padStart(2, "0");
}

/** 디지털 타이머. 마감이면 00:00:00:00 */
export function auctionCountdownParts(
  endsAt: Date | string | null | undefined,
  now = Date.now()
): AuctionCountdownParts | null {
  const end = auctionEndsAtMs(endsAt);
  if (!end) return null;
  const diff = end - now;
  const totalSecs = diff <= 0 ? 0 : Math.floor(diff / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;
  const d = pad2(days);
  const h = pad2(hours);
  const m = pad2(minutes);
  const s = pad2(seconds);
  return {
    ended: diff <= 0,
    days: d,
    hours: h,
    minutes: m,
    seconds: s,
    text: `${d}:${h}:${m}:${s}`,
  };
}

export function formatAuctionCountdown(endsAt: Date | string, now = Date.now()): string {
  const parts = auctionCountdownParts(endsAt, now);
  if (!parts) return "—";
  if (parts.ended) return translate("en", "used.auction.countdownEnded");
  return parts.text;
}

const AUCTION_STATE_KEYS: Record<UsedAuctionState, string> = {
  LIVE: "used.auction.stateLive",
  ENDED: "used.auction.stateEnded",
  CANCELLED: "used.auction.stateCancelled",
  PAYMENT_PENDING: "used.auction.statePaymentPending",
  PAYMENT_COMPLETED: "used.auction.statePaymentCompleted",
  PAYMENT_TIMEOUT: "used.auction.statePaymentTimeout",
  TRANSFERRED_TO_NEXT_BIDDER: "used.auction.stateTransferred",
  PRICE_NEGOTIATION: "used.auction.stateNegotiation",
  NEGOTIATION_COMPLETED: "used.auction.stateNegotiationDone",
  NEGOTIATION_FAILED: "used.auction.stateNegotiationFailed",
};

export function auctionStateLabel(state: UsedAuctionState | null | undefined): string {
  if (!state) return "";
  const key = AUCTION_STATE_KEYS[state];
  return key ? translate("en", key) : "";
}

export function isPaymentPending(l: AuctionListingSlice): boolean {
  return l.auctionState === "PAYMENT_PENDING";
}

export function isPriceNegotiation(l: AuctionListingSlice): boolean {
  return l.auctionState === "PRICE_NEGOTIATION";
}

export function computeAuctionEndsAt(hours: number, now = Date.now()): Date {
  return new Date(now + hours * 60 * 60 * 1000);
}

export function standardAuctionEndsAt(now = Date.now()): Date {
  return computeAuctionEndsAt(AUCTION_DURATION_HOURS, now);
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
