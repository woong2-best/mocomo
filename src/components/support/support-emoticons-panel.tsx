import Link from "next/link";
import { getEmoticonPacks } from "@/actions/goods-shop";
import { EmoticonPreview } from "@/components/market/emoticon-preview";
import { formatUsd } from "@/lib/money";

export async function SupportEmoticonsPanel({
  priceFilter,
}: {
  priceFilter?: string;
}) {
  const { packs } = await getEmoticonPacks().catch(() => ({ packs: [], dbReady: false }));

  const filtered = priceFilter
    ? packs.filter((p) => p.price === Number(priceFilter))
    : packs;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        후원할 때 스트리머에게 보낼 MoCoMo 이모티콘을 구매합니다. 구매 후 보관함에서
        크리에이터에게 선물하세요.
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground text-sm">
          표시할 이모티콘이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/support/emoticons/${p.slug}`}
              className="rounded-2xl border border-border/60 overflow-hidden hover:shadow-md hover:border-primary/30 transition-all bg-card"
            >
              <EmoticonPreview name={p.name} price={p.price} previewUrl={p.previewUrl} />
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-primary font-bold text-sm mt-1">
                  {formatUsd(p.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
