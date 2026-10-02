import type { ContentRating } from "@prisma/client";
import { isAdultContent } from "@/lib/content-rating";

/** 성인·NSFW 콘텐츠 유료화 금지 — 플랫폼 전역 (결제·판매·후원·구독 등) */
export const ADULT_MONETIZATION_BANNED_MESSAGE =
  "Adult and NSFW content can't be sold, tipped, subscribed to, paywalled, or monetized in any way on MoCoMo. See the Terms of Service and payment policy.";

export const ADULT_MONETIZATION_BANNED_SHORT =
  "Paid sales and tips for adult content are not allowed.";

export function assertAdultContentNotMonetized(
  contentRating: ContentRating | boolean | null | undefined,
  opts?: { hasPrice?: boolean; hasPaidMedia?: boolean; hasInstantPurchase?: boolean }
): string | null {
  if (!isAdultContent(contentRating)) return null;

  const hasMonetization =
    opts?.hasPrice ||
    opts?.hasPaidMedia ||
    opts?.hasInstantPurchase;

  if (hasMonetization) {
    return ADULT_MONETIZATION_BANNED_MESSAGE;
  }

  return null;
}

export function assertPaymentNotForAdultContent(
  contentRating: ContentRating | boolean | null | undefined
): { error: string } | null {
  if (isAdultContent(contentRating)) {
    return { error: ADULT_MONETIZATION_BANNED_MESSAGE };
  }
  return null;
}

export function adultMonetizationFromMetadata(
  metadata: Record<string, unknown>
): ContentRating | boolean | null {
  if (metadata.contentRating === "ADULT" || metadata.contentRating === "GENERAL") {
    return metadata.contentRating;
  }
  if (metadata.isNsfw === true || metadata.isNsfw === "true") return "ADULT";
  return null;
}
