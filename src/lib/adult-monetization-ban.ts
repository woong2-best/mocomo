import type { ContentRating } from "@prisma/client";
import { isAdultContent } from "@/lib/content-rating";

/** 성인·NSFW 콘텐츠 유료화 금지 — 플랫폼 전역 (결제·판매·후원·구독 등) */
export const ADULT_MONETIZATION_BANNED_MESSAGE =
  "성인·NSFW 콘텐츠는 MoCoMo에서 판매·후원·구독·유료 열람 등 어떠한 형태의 유료 거래도 할 수 없습니다. 이용약관 및 결제 정책을 확인해 주세요.";

export const ADULT_MONETIZATION_BANNED_SHORT =
  "성인 콘텐츠는 유료 판매·후원이 금지되어 있습니다.";

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
