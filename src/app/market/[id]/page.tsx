import Link from "next/link";

import { notFound } from "next/navigation";

import { auth, isSiteOperator } from "@/lib/auth";
import { db } from "@/lib/db";

import { getUsedListing } from "@/actions/used-market";

import { UsedDetailBottomBar } from "@/components/used/used-detail-bottom-bar";

import { UsedAuctionBottomBar } from "@/components/used/used-auction-bottom-bar";

import { UsedAuctionPanel } from "@/components/used/used-auction-panel";
import { UsedAuctionPaymentPanel } from "@/components/used/used-auction-payment-panel";
import { UsedPriceNegotiationPanel } from "@/components/used/used-price-negotiation-panel";

import { UsedAuctionBidHistory } from "@/components/used/used-auction-bid-history";

import { UsedDetailHeader } from "@/components/used/used-detail-header";

import { UsedImageGallery } from "@/components/used/used-image-gallery";

import { UsedMeetLocation } from "@/components/used/used-meet-location";
import { buildListingMeetMapPayload } from "@/lib/maps/meet-map-payload";

import { UsedStatusSheet } from "@/components/used/used-status-sheet";

import { ContentModerationBar } from "@/components/moderation/content-moderation-bar";

import {

  displayAuctionPrice,
  displayUsedRegion,
  formatUsedPrice,
  listingImages,
  usedStatusLabel,
} from "@/lib/used-market";
import { UsedAuctionCountdown } from "@/components/used/used-auction-countdown";
import { UsedAuctionTradeComplete } from "@/components/used/used-auction-trade-complete";
import {
  SubcultureMetaBadges,
  SubcultureMetaDetail,
  parseSubcultureMetaFromDb,
} from "@/components/used/subculture-meta-badges";
import { UsedSaleStatsPanel } from "@/components/used/used-sale-stats-panel";

import { isAuctionListing, minNextBidAmount } from "@/lib/used-auction";
import { getMocoBalanceSnapshot } from "@/lib/auction-deposit";
import { UsedRestrictedBanner } from "@/components/used/used-restricted-banner";
import { UsedAuctionLegalNotice } from "@/components/used/used-auction-legal-notice";
import { isUsedRestrictedKind } from "@/lib/used-youth-protection";

import type { UsedListingStatus } from "@prisma/client";



export default async function UsedDetailPage({ params }: { params: Promise<{ id: string }> }) {

  const { id } = await params;

  const session = await auth();

  const data = await getUsedListing(id, session?.user?.id);

  if (!data) notFound();



  const {

    listing,

    favorited,
    starred,

    chatCount,

    buyerChatRoomId,

    auctionLive,

    myHighestBid,

    isWinningBidder,

    viewerAdultVerified,

    auctionBids,

    priceOffers,

  } = data;

  const imgs = listingImages(listing.images);

  const isSeller = session?.user?.id === listing.sellerId;

  const viewerPrefs = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { showNsfw: true },
      })
    : null;
  const viewerShowNsfw = viewerPrefs?.showNsfw ?? false;

  const isStaff =

    !!session?.user?.username &&

    !!session?.user?.role &&

    isSiteOperator({ username: session.user.username, role: session.user.role });

  const status = listing.status as UsedListingStatus;

  const isAuction = isAuctionListing(listing);

  const auctionWalletMoco =
    session?.user?.id && isAuction
      ? (await getMocoBalanceSnapshot(session.user.id)).availableMocoBalance
      : null;

  const statusBadge =

    status !== "SELLING"

      ? usedStatusLabel(status)

      : isAuction && auctionLive

        ? "경매중"

        : undefined;

  const displayPrice = isAuction ? displayAuctionPrice(listing) : listing.price;

  const meetMap = await buildListingMeetMapPayload({
    region: listing.region,
    meetPlace: listing.meetPlace,
    meetLat: listing.meetLat,
    meetLng: listing.meetLng,
    meetCountry: listing.meetCountry,
    sellerCountryCode:
      (listing.seller as { countryCode?: string | null } | null | undefined)?.countryCode ??
      null,
    resolveGeocode: true,
  });

  return (

    <div className="bg-background min-h-app flex flex-col -mx-4 md:mx-0">

      <div className="px-2 border-b border-border/60">

        <ContentModerationBar

          targetType="USED_LISTING"

          targetId={listing.id}

          reportedUserId={listing.sellerId}

          isStaff={isStaff}

          isLoggedIn={!!session?.user}

        />

      </div>



      <UsedDetailHeader
        listingId={listing.id}
        isSeller={!!isSeller}
        initialFavorited={favorited}
        initialStarred={starred}
        heading={isAuction ? "경매" : "상품"}
      />



      <UsedImageGallery
        images={imgs}
        statusBadge={statusBadge}
        isNsfw={listing.isNsfw}
        isOwner={isSeller}
        viewerShowNsfw={viewerShowNsfw}
      />



      <div className="p-4 space-y-4 flex-1 pb-action-bar">

        {isUsedRestrictedKind(listing.restrictedKind ?? "NONE") && (
          <UsedRestrictedBanner
            restrictedKind={listing.restrictedKind ?? "NONE"}
            adultVerified={viewerAdultVerified}
            listingId={listing.id}
          />
        )}

        {isSeller && !isAuction && (

          <UsedStatusSheet listingId={listing.id} currentStatus={status} />

        )}

        {isSeller && isAuction && auctionLive && (

          <p className="text-xs text-muted-foreground px-1">

            경매 종료 후 예약/완료 상태를 변경할 수 있습니다.

          </p>

        )}

        {isSeller && isAuction && !auctionLive && (

          <UsedStatusSheet listingId={listing.id} currentStatus={status} />

        )}



        <div className="space-y-2">
          <h1 className="text-lg font-bold leading-snug">{listing.title}</h1>
          <p className="text-[22px] font-extrabold leading-none">
            {isAuction && listing.bidCount > 0 ? "현재 " : isAuction ? "최소 입찰 " : ""}
            {formatUsedPrice(displayPrice, listing.currency)}
            {isAuction && listing.bidCount > 0 ? ` · 입찰 ${listing.bidCount}회` : ""}
          </p>
          {isAuction && listing.bidCount === 0 && (
            <p className="text-xs text-muted-foreground">
              시작가 {formatUsedPrice(listing.price, listing.currency)}
            </p>
          )}
          {isAuction && listing.auctionEndsAt && listing.status === "SELLING" ? (
            <UsedAuctionCountdown
              endsAt={
                listing.auctionEndsAt instanceof Date
                  ? listing.auctionEndsAt.toISOString()
                  : String(listing.auctionEndsAt)
              }
            />
          ) : null}
          {listing.description ? (
            <p className="whitespace-pre-wrap pt-2 text-sm leading-6 text-foreground">{listing.description}</p>
          ) : null}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {listing.workTitle ? (
              <span className="inline-flex items-center rounded-[10px] bg-folk-cobalt/10 px-2 py-1 text-[11px] font-bold leading-tight text-folk-cobalt">
                {listing.workTitle}
              </span>
            ) : null}
            <SubcultureMetaBadges
              productType={listing.productType}
              characterName={listing.characterName}
              conditionGrade={listing.conditionGrade}
              limitedKind={listing.limitedKind}
              listingFormat={listing.listingFormat}
              tradeMode={listing.tradeMode}
              itemOrigin={listing.itemOrigin}
              packagingState={listing.packagingState}
              subcultureMeta={parseSubcultureMetaFromDb(listing.subcultureMeta)}
              max={8}
              tone="cobalt"
            />
          </div>
          <SubcultureMetaDetail
            subcultureMeta={parseSubcultureMetaFromDb(listing.subcultureMeta)}
          />
          <p className="text-sm text-muted-foreground">
            {displayUsedRegion(listing.region) || "지역 미정"}
            {listing.seller?.username ? (
              <>
                {" · "}
                <Link href={`/u/${listing.seller.username}`} className="font-semibold text-foreground">
                  @{listing.seller.username}
                </Link>
              </>
            ) : null}
          </p>
          {listing.meetPlace?.trim() ? (
            <p className="text-sm font-semibold text-foreground">
              거래 희망 장소 · {listing.meetPlace.trim()}
            </p>
          ) : null}
        </div>



        {isAuction && (

          <>

            <UsedAuctionPanel

              listing={listing}

              myHighestBid={myHighestBid}

              isWinningBidder={isWinningBidder}

              viewerId={session?.user?.id}

            />

            {(listing.auctionState === "PAYMENT_PENDING" ||
              listing.auctionState === "PAYMENT_COMPLETED") &&
              (listing.paymentDueAt || listing.marketplaceOrderId) && (
              <UsedAuctionPaymentPanel
                listingId={listing.id}
                paymentDueAt={listing.paymentDueAt ?? new Date()}
                amount={displayPrice}
                currency={listing.currency}
                isWinner={!!isWinningBidder}
                paymentCompleted={!!listing.paymentCompletedAt}
                marketplaceOrderId={listing.marketplaceOrderId}
              />
            )}

            {listing.auctionState === "PRICE_NEGOTIATION" &&
              listing.activeNegotiationRoomId &&
              session?.user?.id && (
                <UsedPriceNegotiationPanel
                  listingId={listing.id}
                  roomId={listing.activeNegotiationRoomId}
                  viewerId={session.user.id}
                  sellerId={listing.sellerId}
                  negotiationBuyerId={listing.negotiationBuyerId}
                  negotiationDueAt={listing.negotiationDueAt}
                  auctionState={listing.auctionState}
                  currentTopBid={listing.currentBidAmount ?? listing.price}
                  currency={listing.currency}
                  secondBidAmount={
                    listing.negotiationBuyerId
                      ? auctionBids.find((b) => b.bidderId === listing.negotiationBuyerId)?.amount
                      : null
                  }
                  offers={priceOffers.map((o) => ({
                    id: o.id,
                    amount: o.amount,
                    status: o.status,
                    proposerId: o.proposerId,
                    proposer: o.proposer,
                  }))}
                />
              )}

            <div>

              <h2 className="text-sm font-semibold mb-2">입찰 내역</h2>

              <UsedAuctionBidHistory
                listingId={listing.id}
                currency={listing.currency}
                initialBids={auctionBids.map((b) => ({
                  id: b.id,
                  amount: b.amount,
                  createdAt: b.createdAt,
                  bidder: { username: b.bidder.username },
                }))}
              />

            </div>

            <UsedAuctionLegalNotice />

          </>

        )}



        <UsedSaleStatsPanel
          workTitle={listing.workTitle}
          animeSlug={listing.animeSlug}
          productType={listing.productType}
          characterName={listing.characterName}
        />

        <UsedMeetLocation
          map={meetMap}
          region={listing.region}
          meetPlace={listing.meetPlace}
        />

        {isAuction && !auctionLive && listing.winningBidderId && status !== "SOLD" ? (
          <UsedAuctionTradeComplete
            listingId={listing.id}
            isSeller={!!isSeller}
            isWinningBidder={!!isWinningBidder}
            sellerConfirmed={!!listing.sellerTradeConfirmedAt}
            buyerConfirmed={!!listing.buyerTradeConfirmedAt}
            hasMeetPin={listing.meetLat != null && listing.meetLng != null}
            sold={false}
          />
        ) : null}

      </div>



      {isAuction ? (

        <UsedAuctionBottomBar

          listingId={listing.id}

          isSeller={!!isSeller}

          isLoggedIn={!!session?.user}

          initialFavorited={favorited}

          status={status}

          chatCount={chatCount}

          initialBuyerRoomId={buyerChatRoomId}

          auctionLive={auctionLive}

          auctionState={listing.auctionState}

          minBid={minNextBidAmount(listing)}
          bidIncrement={listing.bidIncrement}

          buyNowPrice={listing.buyNowPrice}

          isWinningBidder={isWinningBidder}

          restrictedKind={listing.restrictedKind}

          viewerAdultVerified={viewerAdultVerified}

          currency={listing.currency}

          availableMocoBalance={auctionWalletMoco}

        />

      ) : (

        <UsedDetailBottomBar

          listingId={listing.id}

          isSeller={!!isSeller}

          isLoggedIn={!!session?.user}

          initialFavorited={favorited}

          status={status}

          chatCount={chatCount}

          initialBuyerRoomId={buyerChatRoomId}

          restrictedKind={listing.restrictedKind}

          viewerAdultVerified={viewerAdultVerified}

        />

      )}

    </div>

  );

}

