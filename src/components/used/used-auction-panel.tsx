import { formatUsedPrice } from "@/lib/used-market";
import {
  antiSnipeExtensionsRemaining,
  displayAuctionPrice,
  isAuctionListing,
  isAuctionLive,
  isPaymentPending,
  isPriceNegotiation,
  maskBidderName,
  MAX_ANTI_SNIPE_EXTENSIONS,
  minNextBidAmount,
  type AuctionListingSlice,
} from "@/lib/used-auction";
import { UsedAuctionCountdown } from "@/components/used/used-auction-countdown";
import { UsedAuctionPaymentCountdown } from "@/components/used/used-auction-payment-countdown";
import { Gavel, Shield, Zap } from "lucide-react";
import { getServerTranslator } from "@/lib/i18n/server";

import type { UsedAuctionState } from "@prisma/client";

type Listing = AuctionListingSlice & {
  id: string;
  auctionEndsAt: Date | string | null;
  currentBidder?: {
    id: string;
    username: string;
    name: string | null;
    supportTierSent?: string | null;
  } | null;
};

function localizedAuctionState(locale: string | undefined, state: UsedAuctionState | null | undefined) {
  if (state === "LIVE") return t("ui.live_auction");
  if (state === "ENDED") return t("ui.auction_ended");
  if (state === "CANCELLED") return t("ui.auction_cancelled");
  if (state === "PAYMENT_PENDING") return t("ui.won_awaiting_payment");
  if (state === "PAYMENT_COMPLETED") return t("wallet.topup.paymentSuccess");
  if (state === "PAYMENT_TIMEOUT") return t("ui.payment_deadline_passed");
  if (state === "TRANSFERRED_TO_NEXT_BIDDER")
    return t("ui.passed_to_next_bidder");
  if (state === "PRICE_NEGOTIATION") return t("ui.price_negotiation");
  if (state === "NEGOTIATION_COMPLETED") return t("ui.negotiation_complete");
  if (state === "NEGOTIATION_FAILED") return t("ui.negotiation_failed");
  return "";
}

export async function UsedAuctionPanel({
  listing,
  myHighestBid,
  isWinningBidder,
  viewerId,
}: {
  listing: Listing;
  myHighestBid?: number | null;
  isWinningBidder?: boolean;
  viewerId?: string | null;
}) {
  if (!isAuctionListing(listing)) return null;

  const { locale, t } = await getServerTranslator();

  const live = isAuctionLive(listing);
  const paymentPending = isPaymentPending(listing);
  const negotiating = isPriceNegotiation(listing);
  const current = displayAuctionPrice(listing);
  const minBid = minNextBidAmount(listing);
  const hasReserve = listing.reservePrice != null && listing.reservePrice > 0;
  const endsAt = listing.auctionEndsAt;
  const extensionsLeft = antiSnipeExtensionsRemaining(listing.auctionExtensionCount);

  return (
    <section className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400">
          <Gavel className="h-4 w-4" />
          {t("ui.auction")}
          {live
            ? t("ui.live")
            : localizedAuctionState(locale, listing.auctionState) || ""}
        </span>
        {paymentPending && listing.paymentDueAt && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">
              {t("ui.time_left_to_pay")}
            </p>
            <UsedAuctionPaymentCountdown dueAt={listing.paymentDueAt} className="text-sm" />
          </div>
        )}
      </div>

      {endsAt && (live || listing.status === "SELLING") && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">
            {t("ui.time_left")}
          </p>
          <UsedAuctionCountdown endsAt={endsAt} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">
            {listing.bidCount > 0
              ? t("ui.current_price")
              : t("ui.starting_price")}
          </p>
          <p className="text-xl font-black">{formatUsedPrice(current, listing.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t("used.bidCountShort", { count: String(listing.bidCount) })}
          </p>
          <p className="text-sm font-medium mt-1">
            {t("ui.next_min")}{" "}
            <span className="font-bold text-foreground">{formatUsedPrice(minBid, listing.currency)}</span>
          </p>
        </div>
      </div>

      {listing.buyNowPrice != null && listing.buyNowPrice > 0 && live && (
        <p className="text-xs flex items-center gap-1 text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          {t("ui.buy_now")} {formatUsedPrice(listing.buyNowPrice, listing.currency)}
        </p>
      )}

      {hasReserve && (
        <p className="text-xs flex items-center gap-1 text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          {t("ui.reserve_set_no_sale_if_not")}
        </p>
      )}

      {live && (
        <p className="text-[11px] text-muted-foreground">
          {t("used.auctionAntiSnipe", {
            minutes: String(listing.antiSnipeMinutes),
            maxExtensions: String(MAX_ANTI_SNIPE_EXTENSIONS),
            left: String(extensionsLeft),
          })}
        </p>
      )}

      {listing.currentBidder && listing.bidCount > 0 && (
        <div className="pt-2 border-t border-border/60">
          <p className="text-xs text-muted-foreground mb-1">
            {t("ui.high_bidder")}
          </p>
          <p className="text-sm font-semibold">{maskBidderName(listing.currentBidder.username)}</p>
        </div>
      )}

      {(live || paymentPending) && (
        <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
          {t("ui.bids_are_binding_failure_to_pay")}
        </p>
      )}

      {negotiating && listing.negotiationDueAt && (
        <p className="text-xs text-primary font-medium">
          {t("ui.negotiating_with_next_bidder")}{" "}
          <UsedAuctionPaymentCountdown dueAt={listing.negotiationDueAt} />
        </p>
      )}

      {viewerId && myHighestBid != null && (
        <p
          className={`text-xs font-medium rounded-lg px-2 py-1.5 ${
            isWinningBidder
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isWinningBidder
            ? t("used.highBidderSelf", {
                amount: formatUsedPrice(myHighestBid, listing.currency),
              })
            : t("used.outbid", {
                amount: formatUsedPrice(myHighestBid, listing.currency),
              })}
        </p>
      )}

      {!live && listing.auctionState === "ENDED" && listing.bidCount === 0 && (
        <p className="text-xs text-muted-foreground">
          {t("ui.ended_with_no_bids")}
        </p>
      )}
    </section>
  );
}
