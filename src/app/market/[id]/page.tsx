import Link from "next/link";

import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";

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

import { UsedStatusSheet } from "@/components/used/used-status-sheet";

import { ContentModerationBar } from "@/components/moderation/content-moderation-bar";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {

  displayAuctionPrice,

  formatUsedPrice,

  formatUsedTimeAgo,

  listingImages,

  usedCategoryLabel,

  usedStatusLabel,

} from "@/lib/used-market";
import { usedProductTypeLabel } from "@/lib/used-catalog";
import {
  SubcultureMetaBadges,
  SubcultureMetaDetail,
  parseSubcultureMetaFromDb,
} from "@/components/used/subculture-meta-badges";
import { UsedSaleStatsPanel } from "@/components/used/used-sale-stats-panel";
import { UsedWtbAlertPanel } from "@/components/used/used-wtb-alert-panel";

import { isAuctionListing, minNextBidAmount } from "@/lib/used-auction";
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

    favoriteCount,

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

  const statusBadge =

    status !== "SELLING"

      ? usedStatusLabel(status)

      : isAuction && auctionLive

        ? "경매중"

        : undefined;

  const displayPrice = isAuction ? displayAuctionPrice(listing) : listing.price;



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



      <UsedDetailHeader listingId={listing.id} isSeller={!!isSeller} />



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



        <div>

          {(listing.workTitle || listing.productType) && (
            <p className="text-sm text-primary font-medium mb-1">
              {listing.workTitle && (
                <>
                  {listing.animeSlug ? (
                    <Link href={`/anime/${listing.animeSlug}`} className="hover:underline">
                      {listing.workTitle}
                    </Link>
                  ) : (
                    listing.workTitle
                  )}
                </>
              )}
              {listing.workTitle && listing.productType ? " · " : ""}
              {listing.productType ? usedProductTypeLabel(listing.productType) : ""}
            </p>
          )}
          <h1 className="text-lg font-bold leading-snug">{listing.title}</h1>

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
            className="mt-2"
            max={8}
          />
          <SubcultureMetaDetail
            subcultureMeta={parseSubcultureMetaFromDb(listing.subcultureMeta)}
            className="mt-1.5"
          />

          <UsedSaleStatsPanel
            workTitle={listing.workTitle}
            animeSlug={listing.animeSlug}
            productType={listing.productType}
            characterName={listing.characterName}
          />

          {!isSeller && status === "SELLING" && (
            <UsedWtbAlertPanel
              workTitle={listing.workTitle}
              animeSlug={listing.animeSlug}
              productType={listing.productType}
              characterName={listing.characterName}
              currency={listing.currency}
              loggedIn={!!session?.user?.id}
            />
          )}

          <p className="text-2xl font-black mt-2">

            {isAuction && listing.bidCount > 0 ? "현재 " : ""}

            {formatUsedPrice(displayPrice, listing.currency)}

          </p>

          {isAuction && listing.bidCount === 0 && (

            <p className="text-xs text-muted-foreground mt-1">

              시작가 {formatUsedPrice(listing.price, listing.currency)}

            </p>

          )}

          <p className="text-xs text-muted-foreground mt-2">

            {usedCategoryLabel(listing.category)} · {formatUsedTimeAgo(listing.createdAt)}

            {isAuction ? " · 경매" : ""}

          </p>

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



        <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">

          {listing.description}

        </p>



        <UsedMeetLocation
          region={listing.region}
          meetPlace={listing.meetPlace}
          meetLat={listing.meetLat}
          meetLng={listing.meetLng}
          meetCountry={listing.meetCountry}
        />



        <p className="text-xs text-muted-foreground tabular-nums">

          {isAuction ? `입찰 ${listing.bidCount}` : `채팅 ${chatCount}`} · 관심 {favoriteCount} · 조회{" "}

          {listing.viewCount}

        </p>



        <Link

          href={`/u/${listing.seller.username}`}

          className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border"

        >

          <Avatar className="h-11 w-11">

            <AvatarImage src={listing.seller.image ?? undefined} />

            <AvatarFallback>{listing.seller.username[0]?.toUpperCase()}</AvatarFallback>

          </Avatar>

          <div>

            <DisplayNameWithSupportTier

              name={listing.seller.name || listing.seller.username}

              tier={listing.seller.supportTierSent ?? "SEED"}

              nameClassName="font-semibold text-sm"

              compact

            />

            <p className="text-xs text-muted-foreground">@{listing.seller.username} · 판매자</p>

          </div>

        </Link>

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

          buyNowPrice={listing.buyNowPrice}

          isWinningBidder={isWinningBidder}

          restrictedKind={listing.restrictedKind}

          viewerAdultVerified={viewerAdultVerified}

          currency={listing.currency}

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

