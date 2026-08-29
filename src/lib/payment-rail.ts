import type { ContentRating } from "@prisma/client";
import {
  assertPaymentNotForAdultContent,
  adultMonetizationFromMetadata,
} from "@/lib/adult-monetization-ban";

export type PaymentContext = {
  contentRating?: ContentRating | boolean | null;
  metadata?: Record<string, unknown>;
};

/** Stripe 결제 허용 여부 — 성인 콘텐츠 유료화는 전면 금지 */
export function assertMonetizationPaymentAllowed(
  ctx: PaymentContext
): { ok: true } | { error: string } {
  const rating =
    ctx.contentRating ?? (ctx.metadata ? adultMonetizationFromMetadata(ctx.metadata) : null);
  const block = assertPaymentNotForAdultContent(rating);
  if (block) return block;
  return { ok: true };
}
