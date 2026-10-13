export const USED_LISTING_SELLER_HIDDEN_REASON = "seller_hidden" as const;

export function isSellerHiddenUsedListing(listing: {
  removedAt?: Date | string | null;
  removalReason?: string | null;
}) {
  return !!listing.removedAt && listing.removalReason === USED_LISTING_SELLER_HIDDEN_REASON;
}
