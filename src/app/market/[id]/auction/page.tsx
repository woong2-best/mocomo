import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAuctionBidRoom } from "@/lib/auction-bid-room";
import { AuctionBidRoom } from "@/components/used/auction-bid-room";
import { AppPageChrome } from "@/components/layout/app-page-chrome";

export default async function AuctionRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const room = await getAuctionBidRoom(id, session?.user?.id);
  if (!room) notFound();

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href={`/market/${id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {room.listing.title}
      </Link>
      <AuctionBidRoom listing={room.listing} initialBids={room.bids} />
    </AppPageChrome>
  );
}
