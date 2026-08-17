import type { FeedMedia } from "@/api/feed";

export type ContentLockReason = "none" | "subscription" | "purchase";

export type PaidMediaMonetization = {
  postId: string;
  authorId: string;
  authorUsername: string;
  paymentsEnabled?: boolean;
  subscribedToAuthor?: boolean;
  subscriptionPriceKrw?: number | null;
  postInstantPurchasePriceKrw?: number | null;
  onPurchaseSuccess?: () => void;
};

export function resolvePurchasePriceKrw(
  media: FeedMedia,
  postInstantPurchasePriceKrw?: number | null
): number {
  const mediaPrice = media.priceKrw ?? 0;
  const postPrice = postInstantPurchasePriceKrw ?? 0;
  const resolved = media.instantPurchasePriceKrw ?? (mediaPrice > 0 ? mediaPrice : postPrice);
  return Math.max(0, resolved);
}

export function normalizeLockReason(
  reason: string | null | undefined
): ContentLockReason {
  if (reason === "subscription" || reason === "purchase") return reason;
  return "none";
}
