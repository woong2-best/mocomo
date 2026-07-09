import { UsedLayoutChrome } from "@/components/used/used-layout-chrome";
import { UsedMarketBanBanner } from "@/components/used/used-market-ban-banner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function UsedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let usedMarketBanned = false;
  if (session?.user?.id) {
    try {
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { usedMarketBannedAt: true },
      });
      usedMarketBanned = !!user?.usedMarketBannedAt;
    } catch {
      usedMarketBanned = false;
    }
  }

  return (
    <UsedLayoutChrome>
      {usedMarketBanned && (
        <div className="mb-4">
          <UsedMarketBanBanner banned />
        </div>
      )}
      {children}
    </UsedLayoutChrome>
  );
}
