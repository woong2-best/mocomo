import Link from "next/link";
import { getMyUsedDashboard } from "@/actions/used-market";
import { getMyUsedAuctionBids } from "@/actions/used-auction";
import { formatUsedPrice } from "@/lib/used-market";
import { isAuctionListing } from "@/lib/used-auction";
import { UsedListingGrid } from "@/components/used/used-listing-grid";
import { UsedWtbMySection } from "@/components/used/used-wtb-my-section";

export async function UsedMyContent({ userId }: { userId: string }) {
  const [{ selling, reserved, sold, favorites }, { bids: myBids }] = await Promise.all([
    getMyUsedDashboard(userId),
    getMyUsedAuctionBids(userId),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          판매중 ({selling.length})
        </h2>
        {selling.length === 0 ? (
          <p className="text-sm text-muted-foreground">판매중인 글이 없어요.</p>
        ) : (
          <UsedListingGrid listings={selling} viewerUserId={userId} />
        )}
      </section>

      {reserved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 mb-3">예약중</h2>
          <UsedListingGrid listings={reserved} viewerUserId={userId} />
        </section>
      )}

      {sold.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">거래완료</h2>
          <UsedListingGrid listings={sold} viewerUserId={userId} />
        </section>
      )}

      {myBids.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3">
            내 입찰 ({myBids.length})
          </h2>
          <ul className="space-y-2">
            {myBids.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/market/${b.listing.id}`}
                  prefetch
                  className="block p-3 rounded-xl border bg-card hover:bg-muted/50"
                >
                  <p className="font-medium text-sm line-clamp-1">{b.listing.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    내 입찰 {formatUsedPrice(b.amount, b.listing.currency)}
                    {isAuctionListing(b.listing) && b.listing.currentBidderId === userId
                      ? " · 최고가"
                      : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <UsedWtbMySection />

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          관심목록 ({favorites.length})
        </h2>
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">관심 상품이 없어요.</p>
        ) : (
          <UsedListingGrid
            listings={favorites.map((f) => ({ ...f.listing, favorited: true }))}
            viewerUserId={userId}
          />
        )}
      </section>
    </div>
  );
}
