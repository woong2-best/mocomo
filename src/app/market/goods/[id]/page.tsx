import Link from "next/link";
import { notFound } from "next/navigation";
import { getPhysicalProduct } from "@/actions/goods-shop";
import { isPaymentsConfigured } from "@/lib/payments";
import { PhysicalPurchaseForm } from "@/components/market/physical-purchase-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function GoodsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getPhysicalProduct(id);
  if (!product || !product.active || product.price <= 0) notFound();

  const imgs = product.images as string[] | { images?: string[] };
  const images = Array.isArray(imgs) ? imgs : imgs?.images ?? [];
  const media = product.request?.media as { videoUrl?: string } | null;
  const paymentsEnabled = isPaymentsConfigured();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/market/goods">
        <Button variant="ghost" size="sm" className="gap-1 -ml-2">
          <ChevronLeft className="h-4 w-4" />
          굿즈
        </Button>
      </Link>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt="" className="w-full rounded-2xl aspect-square object-cover border" />
          ) : null}
          <div className="flex gap-2 overflow-x-auto">
            {images.slice(1).map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-16 w-16 rounded-lg object-cover shrink-0" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">{product.title}</h2>
            <Link href={`/u/${product.seller.username}`} className="text-sm text-primary hover:underline">
              @{product.seller.username}
            </Link>
            <p className="text-2xl font-black text-neon-cyan mt-2">{product.price.toLocaleString()}원</p>
            <p className="text-xs text-muted-foreground">배송비 {product.shippingFee.toLocaleString()}원 · 재고 {product.stock}</p>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{product.description}</p>
          {media?.videoUrl && (
            <a href={media.videoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
              소개 영상 보기
            </a>
          )}
        </div>
      </div>

      <PhysicalPurchaseForm
        productId={product.id}
        productTitle={product.title}
        unitPrice={product.price}
        shippingFee={product.shippingFee}
        paymentsEnabled={paymentsEnabled}
      />
    </div>
  );
}
