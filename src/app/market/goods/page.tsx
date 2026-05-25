import Link from "next/link";
import { getPhysicalProducts } from "@/actions/goods-shop";

export default async function GoodsListPage() {
  const products = await getPhysicalProducts().catch(() => []);

  return (
    <div className="space-y-4">
      {products.length === 0 ? (
        <p className="text-center text-muted-foreground py-16 text-sm">판매 중인 굿즈가 없습니다.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const imgs = p.images as string[] | { images?: string[] };
            const thumb = Array.isArray(imgs) ? imgs[0] : imgs?.images?.[0];
            return (
              <Link
                key={p.id}
                href={`/market/goods/${p.id}`}
                className="rounded-2xl border border-border/60 overflow-hidden hover:shadow-md bg-card"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="aspect-square bg-muted/40" />
                )}
                <div className="p-3">
                  <p className="font-semibold text-sm line-clamp-2">{p.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">@{p.seller.username}</p>
                  <p className="font-bold text-neon-cyan mt-2">{p.price.toLocaleString()}원</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
