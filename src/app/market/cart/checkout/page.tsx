import Link from "next/link";
import { MarketPageTitle } from "@/components/market/market-page-chrome";
import { MarketplaceCartCheckoutView } from "@/components/market/marketplace-cart-checkout-view";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export default function MarketCartCheckoutPage() {
  return (
    <>
      <MarketPageTitle>
        <div className="space-y-1 mb-2">
          <Link href="/market/cart" className="text-xs text-muted-foreground hover:text-foreground">
            ← 장바구니
          </Link>
          <h1 className="text-2xl font-bold">주문서</h1>
          <p className="text-sm text-muted-foreground">
            배송지 입력 후 판매자별로 결제합니다. Stripe 국가는 수수료 10%, 직거래 국가는 무통장
            송금입니다.
          </p>
        </div>
      </MarketPageTitle>
      <MarketplaceCartCheckoutView />
    </>
  );
}
