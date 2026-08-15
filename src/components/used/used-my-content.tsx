import Link from "next/link";
import { getMyUsedDashboard } from "@/actions/used-market";
import { getMyUsedAuctionBids } from "@/actions/used-auction";
import { formatUsedPrice } from "@/lib/used-market";
import { isAuctionListing } from "@/lib/used-auction";
import { UsedListingCard } from "@/components/used/used-listing-card";

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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 -mx-4 border-y border-border/60 bg-border/40">
            {selling.map((l) => (
              <UsedListingCard key={l.id} listing={l} dense viewerUserId={userId} />
            ))}
          </div>
        )}
      </section>

      {reserved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 mb-3">예약중</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 -mx-4 border-y border-border/60 bg-border/40">
            {reserved.map((l) => (
              <UsedListingCard key={l.id} listing={l} dense viewerUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {sold.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">거래완료</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 -mx-4 border-y border-border/60 bg-border/40">
            {sold.map((l) => (
              <UsedListingCard key={l.id} listing={l} dense viewerUserId={userId} />
            ))}
          </div>
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
                  href={`/used/${b.listing.id}`}
                  prefetch
                  className="block p-3 rounded-xl border bg-card hover:bg-muted/50"
                >
                  <p className="font-medium text-sm line-clamp-1">{b.listing.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    내 입찰 {formatUsedPrice(b.amount)}
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

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          관심목록 ({favorites.length})
        </h2>
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">관심 상품이 없어요.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-0 -mx-4 border-y border-border/60 bg-border/40">
            {favorites.map((f) => (
              <UsedListingCard key={f.listing.id} listing={f.listing} dense viewerUserId={userId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
