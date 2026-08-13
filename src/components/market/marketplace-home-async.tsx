import Link from "next/link";
import { MarketPageTitle } from "@/components/market/market-page-chrome";
import { MarketSearchBar } from "@/components/market/market-search-bar";
import { MarketServiceStrip } from "@/components/market/market-service-strip";
import { MarketHeroShowcase } from "@/components/market/market-hero-showcase";
import { MarketCategoryRail } from "@/components/market/market-category-rail";
import { MarketplaceListingGrid } from "@/components/market/marketplace-listing-grid";
import { listMarketplaceListings } from "@/actions/marketplace";
import { MARKETPLACE_LISTING_TYPES } from "@/lib/marketplace/constants";
import { MARKET_BRAND_FULL, MARKET_BRAND_NAME } from "@/lib/market-brand";
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
    type && MARKETPLACE_LISTING_TYPES.some((t) => t.id === type)
      ? (type as MarketplaceListingType)
      : undefined;

  const { items } = await listMarketplaceListings({
    type: listingType ?? "ALL",
    q,
    category: category?.trim() || undefined,
    take: 48,
  }).catch(() => ({ items: [], nextCursor: null }));

  const sectionTitle = listingType
    ? listingTypeLabelSafe(listingType)
    : category
      ? `#${category}`
      : q
        ? `"${q}" 검색 결과`
        : "오늘의 발견";

  return (
    <div className="space-y-5 sm:space-y-6">
      <MarketPageTitle>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-folk-terracotta">
              {MARKET_BRAND_FULL}
            </p>
            <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold tracking-tight text-foreground">
              {MARKET_BRAND_NAME}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              사람들이 만든 것을 사고파는 글로벌 서브컬처 마켓플레이스
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              href="/market/sell-item"
              className="rounded-xl bg-folk-terracotta px-3.5 py-2 text-xs font-bold text-white shadow-[2px_2px_0_hsl(var(--folk-cobalt)/0.15)] hover:brightness-110"
            >
              판매 등록
            </Link>
            <Link
              href="/market/seller"
              className="rounded-xl border-2 border-folk-cobalt/25 bg-background px-3.5 py-2 text-xs font-bold text-foreground hover:border-folk-terracotta/50"
            >
              판매자 · 정산
            </Link>
          </div>
        </div>
      </MarketPageTitle>

      <MarketSearchBar initialQuery={q ?? ""} />

      <MarketServiceStrip />

      {!q && !listingType && !category && <MarketHeroShowcase />}

      <MarketCategoryRail activeType={listingType} activeCategory={category} />

      <section className="space-y-3.5">
        <div className="flex items-end justify-between gap-3 border-b border-folk-cobalt/10 pb-2.5">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              {sectionTitle}
              <span className="hidden sm:inline text-muted-foreground font-medium text-sm ml-2">
                | 서브컬처 크리에이터 상품을 한눈에
              </span>
            </h2>
            {items.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {items.length}개 상품
                {q ? ` · 검색: ${q}` : ""}
                {category ? ` · 카테고리: ${category}` : ""}
              </p>
            )}
          </div>
          {(listingType || q || category) && (
            <Link
              href="/market"
              className="shrink-0 text-xs font-semibold text-folk-terracotta hover:underline"
            >
              필터 해제
            </Link>
          )}
        </div>

        <MarketplaceListingGrid items={items} dense />
      </section>

      <section className="rounded-2xl border border-folk-cobalt/15 bg-gradient-to-br from-folk-cream/80 to-background px-4 py-4 sm:px-5 text-xs text-muted-foreground space-y-1.5">
        <p className="font-bold text-sm text-foreground">판매자 안내</p>
        <p>
          한국: 이메일 + SMS + KYC · 해외: 이메일 → Stripe Connect → 신분증 → 은행계좌 순으로
          온보딩합니다.
        </p>
        <p>
          Stripe Connect 정산 · 주문/배송 추적 · 환불·분쟁 · 디지털 다운로드가 {MARKET_BRAND_NAME}에
          통합됩니다.
        </p>
      </section>
    </div>
  );
}

function listingTypeLabelSafe(type: MarketplaceListingType) {
  return MARKETPLACE_LISTING_TYPES.find((t) => t.id === type)?.label ?? type;
}
