import Link from "next/link";
import { getEmoticonPacks } from "@/actions/goods-shop";
import { EmoticonPreview } from "@/components/market/emoticon-preview";

export default async function EmoticonsPage({
  searchParams,
}: {
  searchParams: Promise<{ price?: string }>;
}) {
  const { price: priceFilter } = await searchParams;
  const { packs } = await getEmoticonPacks().catch(() => ({ packs: [], dbReady: false }));

  const filtered = priceFilter
    ? packs.filter((p) => p.price === Number(priceFilter))
    : packs;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        이미지는 추후 업데이트됩니다. 지금은 구매·스토리지·선물 기능을 이용할 수 있습니다.
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground text-sm">
          표시할 이모티콘이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/market/emoticons/${p.slug}`}
              className="rounded-2xl border border-border/60 overflow-hidden hover:shadow-md hover:border-primary/30 transition-all bg-card"
            >
              <EmoticonPreview name={p.name} price={p.price} previewUrl={p.previewUrl} />
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-primary font-bold text-sm mt-1">{p.price.toLocaleString()}원</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
