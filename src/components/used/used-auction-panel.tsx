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
import { uiText } from "@/lib/i18n/ui-text";
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
  if (state === "LIVE") return uiText(locale, "경매 진행중", "Live auction");
  if (state === "ENDED") return uiText(locale, "경매 종료", "Auction ended");
  if (state === "CANCELLED") return uiText(locale, "경매 취소", "Auction cancelled");
  if (state === "PAYMENT_PENDING") return uiText(locale, "낙찰 · 결제 대기", "Won · awaiting payment");
  if (state === "PAYMENT_COMPLETED") return uiText(locale, "결제 완료", "Payment complete");
  if (state === "PAYMENT_TIMEOUT") return uiText(locale, "결제 기한 초과", "Payment deadline passed");
  if (state === "TRANSFERRED_TO_NEXT_BIDDER")
    return uiText(locale, "차순위 승계", "Passed to next bidder");
  if (state === "PRICE_NEGOTIATION") return uiText(locale, "가격 협상 중", "Price negotiation");
  if (state === "NEGOTIATION_COMPLETED") return uiText(locale, "협상 완료", "Negotiation complete");
  if (state === "NEGOTIATION_FAILED") return uiText(locale, "협상 실패", "Negotiation failed");
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

  const { locale } = await getServerTranslator();

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
          {uiText(locale, "경매", "Auction")}
          {live
            ? uiText(locale, " 진행중", " · live")
            : localizedAuctionState(locale, listing.auctionState) || ""}
        </span>
        {paymentPending && listing.paymentDueAt && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">
              {uiText(locale, "남은 결제 시간", "Time left to pay")}
            </p>
            <UsedAuctionPaymentCountdown dueAt={listing.paymentDueAt} className="text-sm" />
          </div>
        )}
      </div>

      {endsAt && (live || listing.status === "SELLING") && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">
            {uiText(locale, "남은 시간", "Time left")}
          </p>
          <UsedAuctionCountdown endsAt={endsAt} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">
            {listing.bidCount > 0
              ? uiText(locale, "현재가", "Current price")
              : uiText(locale, "시작가", "Starting price")}
          </p>
          <p className="text-xl font-black">{formatUsedPrice(current, listing.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {uiText(locale, `입찰 ${listing.bidCount}회`, `${listing.bidCount} bid(s)`)}
          </p>
          <p className="text-sm font-medium mt-1">
            {uiText(locale, "다음 최소", "Next min")}{" "}
            <span className="font-bold text-foreground">{formatUsedPrice(minBid, listing.currency)}</span>
          </p>
        </div>
      </div>

      {listing.buyNowPrice != null && listing.buyNowPrice > 0 && live && (
        <p className="text-xs flex items-center gap-1 text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          {uiText(locale, "즉시구매", "Buy now")} {formatUsedPrice(listing.buyNowPrice, listing.currency)}
        </p>
      )}

      {hasReserve && (
        <p className="text-xs flex items-center gap-1 text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          {uiText(locale, "최저 낙찰가 설정됨 (미달 시 유찰)", "Reserve set (no sale if not met)")}
        </p>
      )}

      {live && (
        <p className="text-[11px] text-muted-foreground">
          {uiText(
            locale,
            `마감 ${listing.antiSnipeMinutes}분 전 입찰 시 ${listing.antiSnipeMinutes}분 연장 (최대 ${MAX_ANTI_SNIPE_EXTENSIONS}회, 남은 ${extensionsLeft}회)`,
            `Bids within ${listing.antiSnipeMinutes} min of end extend by ${listing.antiSnipeMinutes} min (max ${MAX_ANTI_SNIPE_EXTENSIONS}, ${extensionsLeft} left)`
          )}
        </p>
      )}

      {listing.currentBidder && listing.bidCount > 0 && (
        <div className="pt-2 border-t border-border/60">
          <p className="text-xs text-muted-foreground mb-1">
            {uiText(locale, "최고 입찰자", "High bidder")}
          </p>
          <p className="text-sm font-semibold">{maskBidderName(listing.currentBidder.username)}</p>
        </div>
      )}

      {(live || paymentPending) && (
        <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
          {uiText(
            locale,
            "입찰은 법적·계약적 책임이 따르는 약속입니다. 낙찰 후 결제를 완료하지 않을 경우 중고거래 서비스 이용이 제한될 수 있습니다.",
            "Bids are binding. Failure to pay after winning may restrict your access to used goods."
          )}
        </p>
      )}

      {negotiating && listing.negotiationDueAt && (
        <p className="text-xs text-primary font-medium">
          {uiText(locale, "차순위 입찰자와 가격 협상 중 ·", "Negotiating with next bidder ·")}{" "}
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
            ? uiText(
                locale,
                `내가 최고가 (${formatUsedPrice(myHighestBid, listing.currency)})`,
                `You're high bidder (${formatUsedPrice(myHighestBid, listing.currency)})`
              )
            : uiText(
                locale,
                `내 입찰 ${formatUsedPrice(myHighestBid, listing.currency)} · 다른 분이 더 높은 금액`,
                `Your bid ${formatUsedPrice(myHighestBid, listing.currency)} · outbid`
              )}
        </p>
      )}

      {!live && listing.auctionState === "ENDED" && listing.bidCount === 0 && (
        <p className="text-xs text-muted-foreground">
          {uiText(locale, "입찰 없이 종료되었습니다.", "Ended with no bids.")}
        </p>
      )}
    </section>
  );
}
