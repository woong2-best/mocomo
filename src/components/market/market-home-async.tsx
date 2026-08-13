import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Store } from "lucide-react";
import { getPhysicalProducts } from "@/actions/goods-shop";
import { getCachedMarketProducts } from "@/lib/cached-data";
import { MarketPageTitle } from "@/components/market/market-page-chrome";

export async function MarketHomeAsync() {
  const [goods, digital] = await Promise.all([
    getPhysicalProducts().catch(() => []),
    getCachedMarketProducts().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <MarketPageTitle>
        <div>
          <h1 className="text-2xl font-bold">마켓</h1>
          <p className="text-sm text-muted-foreground mt-1">굿즈 · 디지털 · 크리에이터 상품</p>
        </div>
      </MarketPageTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/market/goods">
          <Card className="rounded-2xl hover:border-primary/40 transition-shadow h-full">
            <CardContent className="p-5 flex gap-4 items-center">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Package className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="font-bold">실물 굿즈</p>
                <p className="text-xs text-muted-foreground mt-0.5">{goods.length}개 판매 중</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/market/sell">
          <Card className="rounded-2xl hover:border-primary/40 transition-shadow h-full">
            <CardContent className="p-5 flex gap-4 items-center">
              <div className="h-12 w-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Store className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-bold">굿즈 판매 문의</p>
                <p className="text-xs text-muted-foreground mt-0.5">STAR 마켓 등록</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
      {digital.length > 0 ? (
        <p className="text-sm text-muted-foreground">{digital.length}개 디지털 상품 · 마켓 목록에서 확인</p>
      ) : null}
    </div>
  );
}
