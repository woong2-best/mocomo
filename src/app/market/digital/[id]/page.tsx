import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isPaymentsConfigured } from "@/lib/payments";
import { getUserPurchases } from "@/actions/monetization";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShoppingBag, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseProductButton } from "@/components/market/purchase-product-button";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { formatUsd } from "@/lib/money";

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
    owned = purchases.some((p) => p?.id === product.id);
  }

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link href="/market">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          굿즈샵
        </Button>
      </Link>

      <Card className="overflow-hidden rounded-2xl">
        {product.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.previewUrl} alt={product.title} className="w-full aspect-square object-cover" />
        ) : (
          <div className="aspect-square bg-muted/40 flex items-center justify-center text-muted-foreground text-sm">
            미리보기 없음
          </div>
        )}
        <CardContent className="p-5 space-y-3">
          <p className="text-xs text-muted-foreground">
            {typeLabels[product.type]} · @{product.seller.username}
          </p>
          <NativePageTitle>
            <h1 className="text-xl font-bold">{product.title}</h1>
          </NativePageTitle>
          {product.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{product.description}</p>
          )}
          <p className="text-2xl font-bold text-primary">{formatUsd(product.price)}</p>
          {owned ? (
            <Button asChild className="w-full rounded-xl gap-2">
              <a href={product.fileUrl} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" />
                다운로드
              </a>
            </Button>
          ) : (
            <PurchaseProductButton
              productId={product.id}
              price={product.price}
              title={product.title}
              paymentsEnabled={paymentsEnabled}
            />
          )}
        </CardContent>
      </Card>
    </AppPageChrome>
  );
}
