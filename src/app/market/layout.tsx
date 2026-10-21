import { UsedLayoutChrome } from "@/components/used/used-layout-chrome";
import { UsedMarketBanBanner } from "@/components/used/used-market-ban-banner";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function UsedLayout({ children }: { children: React.ReactNode }) {
  let session: Session | null = null;
  try {
    session = (await auth()) ?? null;
  } catch (err) {
    const error = err instanceof Error ? err : new Error("Market session failed");
    console.error("[market/layout] auth", error.stack ?? error.message);
    session = null;
  }
  let usedMarketBanned = false;
  let bannedAt: Date | null = null;
  let listingTitle: string | null = null;

  if (session?.user?.id) {
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          usedMarketBannedAt: true,
          usedMarketBanListingId: true,
        },
      });
      usedMarketBanned = !!user?.usedMarketBannedAt;
      bannedAt = user?.usedMarketBannedAt ?? null;
      if (user?.usedMarketBanListingId) {
        const listing = await db.usedListing.findUnique({
          where: { id: user.usedMarketBanListingId },
          select: { title: true },
        });
        listingTitle = listing?.title ?? null;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Market ban lookup failed");
      console.error("[market/layout] ban", error.stack ?? error.message);
      usedMarketBanned = false;
    }
  }

  return (
    <UsedLayoutChrome>
      {usedMarketBanned && (
        <div className="mb-4">
          <UsedMarketBanBanner
            banned
            bannedAt={bannedAt}
            listingTitle={listingTitle}
          />
        </div>
      )}
      {children}
    </UsedLayoutChrome>
  );
}
