import type { ContentVisibility } from "@prisma/client";
import { DEFAULT_CREATOR_SUBSCRIPTION_USD_CENTS } from "@/lib/money";

export type CreatorSubscriberTier = "NONE" | "BRONZE" | "SILVER" | "GOLD" | "DIAMOND";

export const DEFAULT_CREATOR_SUBSCRIPTION_PRICE_KRW = DEFAULT_CREATOR_SUBSCRIPTION_USD_CENTS;

export const SUBSCRIBER_TIER_LABELS: Record<CreatorSubscriberTier, string> = {
  NONE: "없음",
  BRONZE: "브론즈 (1개월+)",
  SILVER: "실버 (3개월+)",
  GOLD: "골드 (6개월+)",
  DIAMOND: "다이아 (12개월+)",
};

export const CONTENT_VISIBILITY_OPTIONS: {
  value: ContentVisibility;
  label: string;
  hint: string;
}[] = [
  { value: "PUBLIC", label: "전체 공개", hint: "누구나 열람" },
  { value: "SUBSCRIBERS", label: "구독자 공개", hint: "활성 구독자" },
  { value: "SUBSCRIBER_1M", label: "1개월+ 구독자", hint: "브론즈 이상" },
  { value: "SUBSCRIBER_3M", label: "3개월+ 구독자", hint: "실버 이상" },
  { value: "SUBSCRIBER_6M", label: "6개월+ 구독자", hint: "골드 이상" },
  { value: "SUBSCRIBER_12M", label: "12개월+ 구독자", hint: "다이아" },
];

export function monthsSubscribed(subscribedSince: Date, now = new Date()): number {
  const ms = now.getTime() - subscribedSince.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 30)));
}

export function tierFromSubscriptionMonths(months: number): CreatorSubscriberTier {
  if (months >= 12) return "DIAMOND";
  if (months >= 6) return "GOLD";
  if (months >= 3) return "SILVER";
  if (months >= 1) return "BRONZE";
  return "NONE";
}

export function visibilityMinMonths(visibility: ContentVisibility): number {
  switch (visibility) {
    case "SUBSCRIBERS":
      return 0;
    case "SUBSCRIBER_1M":
      return 1;
    case "SUBSCRIBER_3M":
      return 3;
    case "SUBSCRIBER_6M":
      return 6;
    case "SUBSCRIBER_12M":
      return 12;
    default:
      return 0;
  }
}

export function isVisibilityPublic(visibility: ContentVisibility) {
  return visibility === "PUBLIC";
}

export type ActiveSubscription = {
  subscribedSince: Date;
  currentPeriodEnd: Date;
  status: string;
};

export function isSubscriptionActive(sub: ActiveSubscription | null | undefined, now = new Date()) {
  if (!sub || sub.status !== "active") return false;
  return sub.currentPeriodEnd.getTime() > now.getTime();
}

export function meetsVisibilityRequirement(
  visibility: ContentVisibility,
  sub: ActiveSubscription | null | undefined,
  now = new Date()
): boolean {
  if (isVisibilityPublic(visibility)) return true;
  if (!isSubscriptionActive(sub, now)) return false;
  const months = monthsSubscribed(sub!.subscribedSince, now);
  if (visibility === "SUBSCRIBERS") return months >= 0;
  return months >= visibilityMinMonths(visibility);
}

export function visibilityLabel(visibility: ContentVisibility): string {
  return CONTENT_VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label ?? visibility;
}

export function parseContentVisibility(value: string | undefined): ContentVisibility {
  const allowed: ContentVisibility[] = [
    "PUBLIC",
    "SUBSCRIBERS",
    "SUBSCRIBER_1M",
    "SUBSCRIBER_3M",
    "SUBSCRIBER_6M",
    "SUBSCRIBER_12M",
  ];
  if (value && allowed.includes(value as ContentVisibility)) {
    return value as ContentVisibility;
  }
  return "PUBLIC";
}

export function creatorSubscriptionPriceForUser(priceKrw: number | null | undefined): number {
  return priceKrw && priceKrw > 0 ? priceKrw : DEFAULT_CREATOR_SUBSCRIPTION_PRICE_KRW;
}
