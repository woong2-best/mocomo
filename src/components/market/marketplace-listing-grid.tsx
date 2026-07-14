import Link from "next/link";
import { listingTypeLabel } from "@/lib/marketplace/constants";

type ListingCard = {
  id: string;
  title: string;
  type: Parameters<typeof listingTypeLabel>[0];
  category: string;
  priceAmount: number;
  currency: string;
  coverUrl: string | null;
  productionDays: number | null;
  favoriteCount: number;
  salesCount: number;
  seller: { username: string; image: string | null };
  sellerProfile: { displayName: string; ratingAvg: number; salesCount: number } | null;
};

export function MarketplaceListingGrid({ items }: { items: ListingCard[] }) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        아직 등록된 상품이 없습니다. 첫 판매를 시작해 보세요.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/market/i/${item.id}`}
          className="group overflow-hidden rounded-2xl border border-border/60 bg-card hover:border-primary/40 transition-colors"
        >
          <div className="aspect-square bg-muted/40 overflow-hidden">
            {item.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.coverUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No image
              </div>
            )}
          </div>
          <div className="p-3 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">
              {listingTypeLabel(item.type)} · {item.category}
            </p>
            <p className="text-sm font-semibold line-clamp-2 leading-snug">{item.title}</p>
            <p className="text-sm font-bold text-primary">
              {item.priceAmount.toLocaleString()}
              {item.currency === "krw" ? "원" : ` ${item.currency.toUpperCase()}`}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {item.sellerProfile?.displayName ?? `@${item.seller.username}`}
              {item.sellerProfile && item.sellerProfile.ratingAvg > 0
                ? ` · ★ ${item.sellerProfile.ratingAvg.toFixed(1)}`
                : ""}
            </p>
            {item.productionDays ? (
              <p className="text-[10px] text-muted-foreground">제작 {item.productionDays}일</p>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
