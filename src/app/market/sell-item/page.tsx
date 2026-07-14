import Link from "next/link";
import { MarketPageTitle } from "@/components/market/market-page-chrome";
import { MarketplaceListingForm } from "@/components/market/marketplace-listing-form";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketSellItemPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/market/sell-item");
  }

  return (
    <>
      <MarketPageTitle>
        <div className="space-y-1 mb-2">
          <Link href="/market" className="text-xs text-muted-foreground hover:text-foreground">
            ← MARKET
          </Link>
          <h1 className="text-2xl font-bold">판매 등록</h1>
          <p className="text-sm text-muted-foreground">
            일반 · 주문제작 · 디지털 · 예약판매 상품을 등록합니다.
          </p>
        </div>
      </MarketPageTitle>
      <MarketplaceListingForm />
    </>
  );
}
