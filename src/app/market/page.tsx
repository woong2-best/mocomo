import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

export default async function MarketPage() {
  type ProductWithSeller = Awaited<
    ReturnType<
      typeof db.digitalProduct.findMany<{
        include: { seller: { select: { username: true } } };
      }>
    >
  >;
  let products: ProductWithSeller = [];
  try {
    products = await db.digitalProduct.findMany({
      take: 24,
      orderBy: { salesCount: "desc" },
      include: { seller: { select: { username: true } } },
    });
  } catch {
    products = [];
  }

  const typeLabels: Record<string, string> = {
    ART: "그림",
    EMOTICON: "이모티콘",
    BACKGROUND: "배경",
    PROFILE_ITEM: "프로필 아이템",
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ShoppingBag className="h-6 w-6 text-neon-pink" />
        디지털 굿즈 마켓
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              등록된 상품이 없습니다.
            </CardContent>
          </Card>
        ) : (
          products.map((p) => (
            <Link key={p.id} href={`/market/${p.id}`}>
            <Card className="overflow-hidden hover:border-primary/40 transition-shadow hover:shadow-md h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt={p.title} className="w-full aspect-square object-cover" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {typeLabels[p.type]} · @{p.seller.username}
                </p>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-neon-cyan">{p.price.toLocaleString()}원</p>
                <p className="text-xs text-muted-foreground">{p.salesCount} 판매</p>
              </CardContent>
            </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
