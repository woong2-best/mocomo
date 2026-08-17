import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { listingTypeLabel } from "@/lib/marketplace/constants";
import { MarketplaceListingThumb } from "@/components/market/marketplace-listing-thumb";
import type { MarketplaceListingType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

export type MarketplaceListingCardData = {
  id: string;
  title: string;
  type: MarketplaceListingType;
  category: string;
  priceAmount: number;
  currency: string;
  coverUrl: string | null;
  productionDays: number | null;
  favoriteCount: number;
  salesCount: number;
  isNsfw?: boolean;
  sellerId?: string;
  seller: { username: string; image: string | null };
  sellerProfile: { displayName: string; ratingAvg: number; salesCount: number } | null;
};

const TYPE_BADGE: Record<
  MarketplaceListingType,
  { label: string; className: string }
> = {
  PHYSICAL: {
    label: "일반상품",
    className: "text-folk-cobalt border-folk-cobalt/35 bg-folk-cobalt/5",
  },
  CUSTOM_ORDER: {
    label: "주문제작",
    className: "text-folk-forest border-folk-forest/40 bg-folk-forest/5",
  },
  DIGITAL: {
    label: "디지털",
    className: "text-violet-700 border-violet-400/50 bg-violet-50",
  },
  PREORDER: {
    label: "예약판매",
    className: "text-amber-800 border-amber-500/45 bg-amber-50",
  },
};

function formatPrice(amount: number, _currency: string) {
  return formatMoney(amount);
}

export function MarketplaceListingCard({
  item,
  viewerUserId = null,
  viewerShowNsfw = false,
}: {
  item: MarketplaceListingCardData;
  viewerUserId?: string | null;
  viewerShowNsfw?: boolean;
}) {
  const sellerName = item.sellerProfile?.displayName ?? `@${item.seller.username}`;
  const badge = TYPE_BADGE[item.type] ?? TYPE_BADGE.PHYSICAL;
  const typePrefix = listingTypeLabel(item.type);
  const isOwner = !!viewerUserId && viewerUserId === item.sellerId;

  return (
    <Link
      href={`/market/i/${item.id}`}
      prefetch
      className="market-product-card group block min-w-0"
    >
      <article className="space-y-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-muted/50 ring-1 ring-folk-cobalt/10">
          <MarketplaceListingThumb
            coverUrl={item.coverUrl}
            isNsfw={item.isNsfw}
            isOwner={isOwner}
            viewerShowNsfw={viewerShowNsfw}
          />
          {item.productionDays ? (
            <span className="absolute bottom-2 left-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-bold text-foreground backdrop-blur-sm border border-border/60">
              제작 {item.productionDays}일
            </span>
          ) : null}
        </div>

        <div className="space-y-1.5 px-0.5">
          <h3 className="text-[13px] font-bold leading-snug text-foreground line-clamp-2 tracking-tight">
            <span className="text-muted-foreground font-semibold">({typePrefix}) </span>
            {item.title}
          </h3>

          <p className="text-[11px] text-muted-foreground truncate font-medium">{sellerName}</p>

          <div className="inline-flex items-center rounded-md border border-folk-cobalt/20 bg-muted/40 px-2 py-1">
            <span className="text-[13px] sm:text-sm font-bold tabular-nums text-foreground">
              {formatPrice(item.priceAmount, item.currency)}
            </span>
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
              badge.className
            )}
          >
            <ClipboardList className="h-3 w-3 shrink-0" strokeWidth={2.25} />
            {badge.label}
            {item.category ? ` · ${item.category}` : ""}
          </div>
        </div>
      </article>
    </Link>
  );
}
