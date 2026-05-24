import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isPaymentsConfigured } from "@/lib/payments";
import { getUserPurchases } from "@/actions/monetization";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShoppingBag, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseProductButton } from "@/components/market/purchase-product-button";

const typeLabels: Record<string, string> = {
  ART: "그림",
  EMOTICON: "이모티콘",
  BACKGROUND: "배경",
  PROFILE_ITEM: "프로필 아이템",
};

export default async function MarketProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const paymentsEnabled = isPaymentsConfigured();

  const product = await db.digitalProduct.findUnique({
    where: { id },
    include: { seller: { select: { username: true, name: true, image: true } } },
  });
  if (!product) notFound();

  let owned = false;
  if (session?.user?.id) {
    const purchases = await getUserPurchases(session.user.id);
    owned = purchases.some((p) => p.id === product.id);
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-24 lg:pb-4">
      <Link href="/market">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          마켓
        </Button>
      </Link>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={product.previewUrl} alt={product.title} className="w-full rounded-2xl aspect-square object-cover" />

      <div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ShoppingBag className="h-3 w-3" />
          {typeLabels[product.type] ?? product.type}
        </p>
        <h1 className="text-2xl font-bold mt-1">{product.title}</h1>
        <Link href={`/u/${product.seller.username}`} className="text-sm text-primary hover:underline mt-1 inline-block">
          @{product.seller.username}
        </Link>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-4 space-y-2 text-sm">
          <p>{product.description}</p>
          <p className="text-muted-foreground">{product.salesCount}회 판매</p>
        </CardContent>
      </Card>

      {owned ? (
        <a href={product.fileUrl} download className="block">
          <Button className="w-full rounded-xl gap-2">
            <Download className="h-4 w-4" />
            다운로드
          </Button>
        </a>
      ) : session?.user ? (
        <PurchaseProductButton
          productId={product.id}
          price={product.price}
          title={product.title}
          paymentsEnabled={paymentsEnabled}
        />
      ) : (
        <Link href="/auth/signin">
          <Button className="w-full rounded-xl">로그인 후 구매</Button>
        </Link>
      )}
    </div>
  );
}
