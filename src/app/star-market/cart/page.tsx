import Link from "next/link";
import { MarketPageTitle } from "@/components/market/market-page-chrome";
import { MarketplaceCartView } from "@/components/market/marketplace-cart-view";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export default function MarketCartPage() {
  return (
    <>
      <MarketPageTitle>
        <div className="space-y-1 mb-2">
          <Link href="/market" className="text-xs text-muted-foreground hover:text-foreground">
            ← {MARKET_BRAND_NAME}
          </Link>
          <h1 className="text-2xl font-bold">장바구니</h1>
          <p className="text-sm text-muted-foreground">담아 둔 상품을 확인하고 결제하세요.</p>
        </div>
      </MarketPageTitle>
      <MarketplaceCartView />
    </>
  );
}
