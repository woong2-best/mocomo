import Link from "next/link";
import {
  MarketplaceListingCard,
  type MarketplaceListingCardData,
} from "@/components/market/marketplace-listing-card";

export function MarketplaceListingGrid({
  items,
  dense = true,
}: {
  items: MarketplaceListingCardData[];
  dense?: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-folk-cobalt/20 bg-folk-cream/40 px-6 py-14 text-center space-y-3">
        <p className="text-sm font-semibold text-foreground">아직 등록된 상품이 없습니다</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          첫 판매를 등록하면 여기에 고밀도 상품 그리드로 노출됩니다. 코스프레·굿즈·주문제작 상품을
          올려 보세요.
        </p>
        <Link
          href="/market/sell-item"
          className="inline-flex items-center justify-center rounded-xl bg-folk-terracotta px-4 py-2.5 text-sm font-bold text-white shadow-[2px_3px_0_hsl(var(--folk-cobalt)/0.18)] hover:brightness-110 transition-all"
        >
          판매 등록하기
        </Link>
      </div>
    );
  }

  return (
    <div
      className={
        dense
          ? "grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-3.5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
      }
    >
      {items.map((item) => (
        <MarketplaceListingCard key={item.id} item={item} />
      ))}
    </div>
  );
}
