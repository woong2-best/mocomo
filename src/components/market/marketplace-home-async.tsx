import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { MarketPageTitle } from "@/components/market/market-page-chrome";
import { MarketToolbar } from "@/components/market/market-toolbar";
import { MarketServiceStrip } from "@/components/market/market-service-strip";
import { MarketHeroShowcase } from "@/components/market/market-hero-showcase";
import { MarketCategoryRail } from "@/components/market/market-category-rail";
import { MarketplaceListingGrid } from "@/components/market/marketplace-listing-grid";
import { listMarketplaceListings } from "@/actions/marketplace";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MARKETPLACE_BROWSE_LISTING_TYPES } from "@/lib/marketplace/constants";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";
import type { MarketplaceListingType } from "@prisma/client";

export async function MarketplaceHomeAsync({
  type,
  q,
  category,
}: {
  type?: string;
  q?: string;
  category?: string;
}) {
  const listingType =
    type && type !== "DIGITAL" && MARKETPLACE_BROWSE_LISTING_TYPES.some((t) => t.id === type)
      ? (type as MarketplaceListingType)
      : undefined;

  const [session, { items }] = await Promise.all([
    auth(),
    listMarketplaceListings({
      type: listingType ?? "ALL",
      q,
      category: category?.trim() || undefined,
      take: 48,
    }).catch(() => ({ items: [], nextCursor: null })),
  ]);

  const viewerPrefs = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { showNsfw: true },
      })
    : null;
  const viewerShowNsfw = viewerPrefs?.showNsfw ?? false;

  const sectionTitle = listingType
    ? listingTypeLabelSafe(listingType)
    : category
      ? `#${category}`
      : q
        ? t("market.s1q1ymxv", { v0: q })
        : t("market.sl72tho");

  return (
    <div className="space-y-5 sm:space-y-6">
      <MarketPageTitle>
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1 min-w-0">
              <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground">
                {MARKET_BRAND_NAME}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href="/market/sell-item"
                className="rounded-xl bg-folk-terracotta px-3.5 py-2 text-xs font-bold text-white shadow-[2px_2px_0_hsl(var(--folk-cobalt)/0.15)] hover:brightness-110"
              >
                {t("market.s1vdpeu0")}
              </Link>
            </div>
          </div>
          <MarketToolbar />
        </div>
      </MarketPageTitle>

      <MarketServiceStrip />

      {!q && !listingType && !category && <MarketHeroShowcase />}

      <MarketCategoryRail activeType={listingType} />

      <section className="space-y-3.5">
        <div className="flex items-end justify-between gap-3 border-b border-folk-cobalt/10 pb-2.5">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {sectionTitle}
              <span className="hidden sm:inline text-muted-foreground font-medium text-sm ml-2">
                {t("market.sgmdaj1")}
              </span>
            </h2>
            {items.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("market.productCount", { count: String(items.length) })}
                {q ? t("market.s3jd5wo", { v0: q }) : ""}
                {category ? t("market.s1j08pnx", { v0: category }) : ""}
              </p>
            )}
          </div>
          {(listingType || q || category) && (
            <Link
              href="/market"
              className="shrink-0 text-xs font-semibold text-folk-terracotta hover:underline"
            >
              {t("market.s7wn3h8")}
            </Link>
          )}
        </div>

        <MarketplaceListingGrid
          items={items}
          dense
          viewerUserId={session?.user?.id ?? null}
          viewerShowNsfw={viewerShowNsfw}
        />
      </section>
    </div>
  );
}

function listingTypeLabelSafe(type: MarketplaceListingType) {
  return MARKETPLACE_BROWSE_LISTING_TYPES.find((t) => t.id === type)?.label ?? type;
}
