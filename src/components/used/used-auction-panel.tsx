import { formatUsedPrice } from "@/lib/used-market";
import {
  antiSnipeExtensionsRemaining,
  auctionStateLabel,
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

export function UsedAuctionPanel({
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

  const live = isAuctionLive(listing);
  const paymentPending = isPaymentPending(listing);
  const negotiating = isPriceNegotiation(listing);
  const current = displayAuctionPrice(listing);
  const minBid = minNextBidAmount(listing);
  const hasReserve = listing.reservePrice != null && listing.reservePrice > 0;
  const endsAt = listing.auctionEndsAt;

  return (
    <section className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400">
          <Gavel className="h-4 w-4" />
          경매
          {live ? " 진행중" : auctionStateLabel(listing.auctionState) || ""}
        </span>
        {endsAt && live && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">남은 시간</p>
            <UsedAuctionCountdown endsAt={endsAt} className="text-sm" />
          </div>
        )}
        {paymentPending && listing.paymentDueAt && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">남은 결제 시간</p>
            <UsedAuctionPaymentCountdown dueAt={listing.paymentDueAt} className="text-sm" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{listing.bidCount > 0 ? "현재가" : "시작가"}</p>
          <p className="text-xl font-black">{formatUsedPrice(current, listing.currency)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">입찰 {listing.bidCount}회</p>
          <p className="text-sm font-medium mt-1">
            다음 최소{" "}
            <span className="font-bold text-foreground">{formatUsedPrice(minBid, listing.currency)}</span>
          </p>
        </div>
      </div>

      {listing.buyNowPrice != null && listing.buyNowPrice > 0 && live && (
        <p className="text-xs flex items-center gap-1 text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          즉시구매 {formatUsedPrice(listing.buyNowPrice, listing.currency)}
        </p>
      )}

      {hasReserve && (
        <p className="text-xs flex items-center gap-1 text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          최저 낙찰가 설정됨 (미달 시 유찰)
        </p>
      )}

      {live && (
        <p className="text-[11px] text-muted-foreground">
          마감 {listing.antiSnipeMinutes}분 전 입찰 시 {listing.antiSnipeMinutes}분 연장 (최대{" "}
          {MAX_ANTI_SNIPE_EXTENSIONS}회, 남은 {antiSnipeExtensionsRemaining(listing.auctionExtensionCount)}{" "}
          회)
        </p>
      )}

      {listing.currentBidder && listing.bidCount > 0 && (
        <div className="pt-2 border-t border-border/60">
          <p className="text-xs text-muted-foreground mb-1">최고 입찰자</p>
          <p className="text-sm font-semibold">
            {maskBidderName(listing.currentBidder.username)}
          </p>
        </div>
      )}

      {(live || paymentPending) && (
        <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
          입찰은 법적·계약적 책임이 따르는 약속입니다. 낙찰 후 결제를 완료하지 않을 경우 중고거래
          서비스 이용이 제한될 수 있습니다.
        </p>
      )}

      {negotiating && listing.negotiationDueAt && (
        <p className="text-xs text-primary font-medium">
          차순위 입찰자와 가격 협상 중 ·{" "}
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
            ? `내가 최고가 (${formatUsedPrice(myHighestBid, listing.currency)})`
            : `내 입찰 ${formatUsedPrice(myHighestBid, listing.currency)} · 다른 분이 더 높은 금액`}
        </p>
      )}

      {!live && listing.auctionState === "ENDED" && listing.bidCount === 0 && (
        <p className="text-xs text-muted-foreground">입찰 없이 종료되었습니다.</p>
      )}
    </section>
  );
}
