import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Package, Archive, Store } from "lucide-react";
import { getEmoticonPacks, getPhysicalProducts } from "@/actions/goods-shop";
import { EMOTICON_PRICES } from "@/lib/goods-shop";

export default async function MarketHomePage() {
  const [packs, goods] = await Promise.all([
    getEmoticonPacks().catch(() => []),
    getPhysicalProducts().catch(() => []),
  ]);

  const byPrice = EMOTICON_PRICES.map((price) => ({
    price,
    count: packs.filter((p) => p.price === price).length,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/market/emoticons">
          <Card className="rounded-2xl hover:border-primary/40 transition-shadow h-full">
            <CardContent className="p-5 flex gap-4 items-center">
              <div className="h-12 w-12 rounded-xl bg-violet-500/15 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-violet-600" />
              </div>
              <div>
                <p className="font-bold">MoCoMo 이모티콘</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  1·2·3·5만원 · 구매 후 스트리머에게 1회 선물
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/market/storage">
          <Card className="rounded-2xl hover:border-primary/40 transition-shadow h-full">
            <CardContent className="p-5 flex gap-4 items-center">
              <div className="h-12 w-12 rounded-xl bg-pink-500/15 flex items-center justify-center">
                <Archive className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <p className="font-bold">마이 스토리지</p>
                <p className="text-xs text-muted-foreground mt-0.5">보유 이모티콘 · 사용완료 표시</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/market/goods">
          <Card className="rounded-2xl hover:border-primary/40 transition-shadow h-full">
            <CardContent className="p-5 flex gap-4 items-center">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                <Package className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <p className="font-bold">실물 굿즈</p>
                <p className="text-xs text-muted-foreground mt-0.5">{goods.length}개 판매 중 · 배송/결제</p>
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
                <p className="text-xs text-muted-foreground mt-0.5">등록비 5,000원 · 사진/영상 업로드</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">이모티콘 가격대</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {byPrice.map(({ price, count }) => (
            <Link
              key={price}
              href={`/market/emoticons?price=${price}`}
              className="rounded-xl border border-border/60 p-3 text-center hover:bg-muted/50"
            >
              <p className="font-bold text-neon-cyan">{(price / 10000).toFixed(0)}만원</p>
              <p className="text-xs text-muted-foreground">{count}종</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
