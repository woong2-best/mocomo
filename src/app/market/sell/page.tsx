import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isPaymentsConfigured } from "@/lib/payments";
import { getMySellerProducts } from "@/actions/goods-shop";
import { GoodsListingForm } from "@/components/market/goods-listing-form";
import { SetProductPriceForm } from "@/components/market/set-product-price-form";
import Link from "next/link";

export default async function MarketSellPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/market/sell");

  const products = await getMySellerProducts().catch(() => []);
  const paymentsEnabled = isPaymentsConfigured();

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <section className="space-y-3">
        <h2 className="font-bold text-lg">굿즈 판매 문의</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          사진·설명·영상을 올리고 등록비 5,000원을 결제하면 상품을 등록할 수 있습니다. 판매·배송·결제는
          MoCoMo 굿즈샵에서 처리됩니다 (플랫폼 수수료 10%).
        </p>
        <GoodsListingForm paymentsEnabled={paymentsEnabled} />
      </section>

      {products.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold">내 등록 상품</h2>
          <ul className="space-y-4">
            {products.map((p) => {
              const imgs = p.images as string[];
              const thumb = Array.isArray(imgs) ? imgs[0] : undefined;
              return (
                <li key={p.id} className="rounded-2xl border border-border/60 p-4 space-y-3">
                  <div className="flex gap-3">
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    )}
                    <div>
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.active && p.price > 0
                          ? `${p.price.toLocaleString()}원 · 판매 중`
                          : "가격 설정 필요"}
                      </p>
                    </div>
                  </div>
                  {p.price === 0 && p.request?.listingFeePaid && (
                    <SetProductPriceForm
                      productId={p.id}
                      currentPrice={0}
                      currentShipping={p.shippingFee}
                    />
                  )}
                  {p.active && p.price > 0 && (
                    <Link href={`/market/goods/${p.id}`} className="text-sm text-primary hover:underline">
                      상품 페이지 보기 →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
