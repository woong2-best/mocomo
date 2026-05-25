import Link from "next/link";
import { getEmoticonPacks } from "@/actions/goods-shop";

export default async function EmoticonsPage({
  searchParams,
}: {
  searchParams: Promise<{ price?: string }>;
}) {
  const { price: priceFilter } = await searchParams;
  const packs = await getEmoticonPacks().catch(() => []);
  const filtered = priceFilter
    ? packs.filter((p) => p.price === Number(priceFilter))
    : packs;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        구매 시 마이 스토리지에 보관됩니다. 스트리머에게 내면 수수료 10% 제외 금액이 스트리머에게 적립됩니다.
      </p>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <Link
            key={p.id}
            href={`/market/emoticons/${p.slug}`}
            className="rounded-2xl border border-border/60 overflow-hidden hover:shadow-md hover:border-primary/30 transition-all bg-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.previewUrl} alt={p.name} className="w-full aspect-square object-cover bg-muted/30 p-4" />
            <div className="p-3">
              <p className="font-semibold text-sm truncate">{p.name}</p>
              <p className="text-neon-cyan font-bold text-sm mt-1">{p.price.toLocaleString()}원</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
