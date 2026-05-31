import Link from "next/link";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { notFound } from "next/navigation";
import { auth, isSiteOperator } from "@/lib/auth";
import { getUsedListing } from "@/actions/used-market";
import { UsedDetailBottomBar } from "@/components/used/used-detail-bottom-bar";
import { UsedAuctionBottomBar } from "@/components/used/used-auction-bottom-bar";
import { UsedAuctionPanel } from "@/components/used/used-auction-panel";
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
import { isAuctionListing, minNextBidAmount } from "@/lib/used-auction";
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
  } = data;
  const imgs = listingImages(listing.images);
  const isSeller = session?.user?.id === listing.sellerId;
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
    <div className="-mx-4 bg-background min-h-[100dvh] flex flex-col">
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

      <UsedImageGallery images={imgs} statusBadge={statusBadge} />

      <div className="p-4 space-y-4 flex-1 pb-28">
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
          <h1 className="text-lg font-bold leading-snug">{listing.title}</h1>
          <p className="text-2xl font-black mt-2">
            {isAuction && listing.bidCount > 0 ? "현재 " : ""}
            {formatUsedPrice(displayPrice)}
          </p>
          {isAuction && listing.bidCount === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              시작가 {formatUsedPrice(listing.price)}
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
            <div>
              <h2 className="text-sm font-semibold mb-2">입찰 내역</h2>
              <UsedAuctionBidHistory listingId={listing.id} />
            </div>
          </>
        )}

        <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">
          {listing.description}
        </p>

        <UsedMeetLocation region={listing.region} meetPlace={listing.meetPlace} />

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
              tier={listing.seller.supportTierSent ?? "PEBBLE"}
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
          minBid={minNextBidAmount(listing)}
          buyNowPrice={listing.buyNowPrice}
          isWinningBidder={isWinningBidder}
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
        />
      )}
    </div>
  );
}
