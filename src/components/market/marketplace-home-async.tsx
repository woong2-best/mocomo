import Link from "next/link";
import { Brush, Package, Palette, Sparkles, Store, Tags } from "lucide-react";
import { MarketPageTitle } from "@/components/market/market-page-chrome";
import { MarketplaceListingGrid } from "@/components/market/marketplace-listing-grid";
import { listMarketplaceListings } from "@/actions/marketplace";
import { MARKETPLACE_LISTING_TYPES } from "@/lib/marketplace/constants";
import type { MarketplaceListingType } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";

export async function MarketplaceHomeAsync({
  type,
  q,
}: {
  type?: string;
  q?: string;
}) {
  const listingType =
    type && MARKETPLACE_LISTING_TYPES.some((t) => t.id === type)
      ? (type as MarketplaceListingType)
      : undefined;

  const { items } = await listMarketplaceListings({
    type: listingType ?? "ALL",
    q,
    take: 24,
  }).catch(() => ({ items: [], nextCursor: null }));

  return (
    <div className="space-y-6">
      <MarketPageTitle>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">MARKET</h1>
          <p className="text-sm text-muted-foreground">
            사람들이 만든 것을 사고파는 글로벌 서브컬처 마켓플레이스
          </p>
        </div>
      </MarketPageTitle>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/market/sell-item"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          판매 등록
        </Link>
        <Link
          href="/market/seller"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
        >
          판매자 · 정산
        </Link>
        <Link
          href="/used"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted/50"
        >
          중고거래
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {MARKETPLACE_LISTING_TYPES.map((t) => (
          <Link key={t.id} href={`/market?type=${t.id}`}>
            <Card
              className={`rounded-2xl h-full transition-colors ${
                listingType === t.id ? "border-primary" : "hover:border-primary/40"
              }`}
            >
              <CardContent className="p-4 space-y-1">
                <p className="font-bold text-sm">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/market/emoticons" className="rounded-xl border border-border/60 p-4 hover:bg-muted/40 flex gap-3 items-center">
          <Sparkles className="h-5 w-5 text-violet-600" />
          <div>
            <p className="font-semibold text-sm">이모티콘</p>
            <p className="text-xs text-muted-foreground">공식 굿즈샵</p>
          </div>
        </Link>
        <Link href="/webtoon" className="rounded-xl border border-border/60 p-4 hover:bg-muted/40 flex gap-3 items-center">
          <Brush className="h-5 w-5 text-sky-600" />
          <div>
            <p className="font-semibold text-sm">일러스트 작품</p>
            <p className="text-xs text-muted-foreground">픽시브형 열람·구매</p>
          </div>
        </Link>
        <Link href="/used" className="rounded-xl border border-border/60 p-4 hover:bg-muted/40 flex gap-3 items-center">
          <Tags className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-semibold text-sm">중고 · 경매</p>
            <p className="text-xs text-muted-foreground">C2C</p>
          </div>
        </Link>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Store className="h-4 w-4" />
            {listingType ? listingTypeLabelSafe(listingType) : "전체 상품"}
          </h2>
          {listingType && (
            <Link href="/market" className="text-xs text-muted-foreground hover:text-foreground">
              필터 해제
            </Link>
          )}
        </div>
        <MarketplaceListingGrid items={items} />
      </section>

      <section className="rounded-2xl border border-dashed border-border/70 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Package className="h-4 w-4" />
          Marketplace 로드맵
        </p>
        <p>Stripe Connect 정산 · 주문/배송 추적 · 환불·분쟁 · 리뷰 · 디지털 다운로드 · 자동 구매확정</p>
        <p className="flex items-center gap-1">
          <Palette className="h-3.5 w-3.5" />
          코스프레 주문제작 · 팬아트 · 동인지 · 디지털 에셋 판매를 MARKET에 통합합니다.
        </p>
      </section>
    </div>
  );
}

function listingTypeLabelSafe(type: MarketplaceListingType) {
  return MARKETPLACE_LISTING_TYPES.find((t) => t.id === type)?.label ?? type;
}
