import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getMyUsedDashboard } from "@/actions/used-market";
import { UsedListingCard } from "@/components/used/used-listing-card";
import { ChevronLeft } from "lucide-react";

export default async function UsedMyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/used/my");

  const { selling, reserved, sold, favorites } = await getMyUsedDashboard();

  return (
    <div className="py-4 space-y-8 max-w-lg mx-auto">
      <Link href="/used" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium">
        <ChevronLeft className="h-4 w-4" />
        중고거래 홈
      </Link>
      <h1 className="text-xl font-bold">내 중고거래</h1>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">판매중 ({selling.length})</h2>
        {selling.length === 0 ? (
          <p className="text-sm text-muted-foreground">판매중인 글이 없어요.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {selling.map((l) => (
              <UsedListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>

      {reserved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-amber-700 mb-3">예약중</h2>
          <div className="grid grid-cols-2 gap-3">
            {reserved.map((l) => (
              <UsedListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      {sold.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">거래완료</h2>
          <div className="grid grid-cols-2 gap-3">
            {sold.map((l) => (
              <UsedListingCard key={l.id} listing={l} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">관심목록 ({favorites.length})</h2>
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground">관심 상품이 없어요.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favorites.map((f) => (
              <UsedListingCard key={f.listing.id} listing={f.listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
