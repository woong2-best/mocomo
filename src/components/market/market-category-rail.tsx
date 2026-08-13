import Link from "next/link";
import { MARKETPLACE_BROWSE_LISTING_TYPES } from "@/lib/marketplace/constants";
import type { MarketplaceListingType } from "@prisma/client";
import { cn } from "@/lib/utils";

export function MarketCategoryRail({
  activeType,
}: {
  activeType?: MarketplaceListingType;
  activeCategory?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/market"
        className={cn(
          "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
          !activeType
            ? "border-folk-terracotta bg-folk-terracotta text-white"
            : "border-folk-cobalt/20 bg-background text-foreground hover:border-folk-terracotta/50"
        )}
      >
        전체
      </Link>
      {MARKETPLACE_BROWSE_LISTING_TYPES.map((t) => (
        <Link
          key={t.id}
          href={`/market?type=${t.id}`}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
            activeType === t.id
              ? "border-folk-terracotta bg-folk-terracotta text-white"
              : "border-folk-cobalt/20 bg-background text-foreground hover:border-folk-terracotta/50"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
