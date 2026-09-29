import { getUsedNegotiationForChat } from "@/actions/used-auction-chat";
import { UsedPriceNegotiationPanel } from "@/components/used/used-price-negotiation-panel";

export async function UsedAuctionChatNegotiation({
  roomId,
  listingId,
}: {
  roomId: string;
  listingId?: string;
}) {
  const ctx = await getUsedNegotiationForChat(roomId, listingId);
  if (!ctx) return null;

  const topBid = ctx.listing.currentBidAmount ?? ctx.listing.price;

  return (
    <div className="shrink-0 border-b border-border/60 p-3 bg-muted/20">
      <UsedPriceNegotiationPanel
        listingId={ctx.listing.id}
        roomId={roomId}
        viewerId={ctx.viewerId}
        sellerId={ctx.listing.sellerId}
        negotiationBuyerId={ctx.listing.negotiationBuyerId}
        negotiationDueAt={ctx.listing.negotiationDueAt}
        auctionState={ctx.listing.auctionState}
        currentTopBid={topBid}
        secondBidAmount={ctx.secondBidAmount}
        offers={ctx.offers.map((o) => ({
          id: o.id,
          amount: o.amount,
          status: o.status,
          proposerId: o.proposerId,
          proposer: o.proposer,
        }))}
      />
    </div>
  );
}
