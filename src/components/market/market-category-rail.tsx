import Link from "next/link";
import { MARKETPLACE_CATEGORIES, MARKETPLACE_LISTING_TYPES } from "@/lib/marketplace/constants";
import type { MarketplaceListingType } from "@prisma/client";
import { cn } from "@/lib/utils";

export function MarketCategoryRail({
  activeType,
  activeCategory,
}: {
  activeType?: MarketplaceListingType;
  activeCategory?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/market"
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
            !activeType && !activeCategory
              ? "border-folk-terracotta bg-folk-terracotta text-white"
              : "border-folk-cobalt/20 bg-background text-foreground hover:border-folk-terracotta/50"
          )}
        >
          전체
        </Link>
        {MARKETPLACE_LISTING_TYPES.map((t) => (
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

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 -mx-0.5 px-0.5">
        {MARKETPLACE_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/market?category=${encodeURIComponent(cat)}`}
            className={cn(
              "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors",
              activeCategory === cat
                ? "border-folk-terracotta/50 bg-folk-cream text-folk-terracotta"
                : "border-folk-cobalt/15 bg-muted/30 text-muted-foreground hover:text-foreground hover:border-folk-terracotta/40 hover:bg-folk-cream/60"
            )}
          >
            #{cat}
          </Link>
        ))}
      </div>
    </div>
  );
}
