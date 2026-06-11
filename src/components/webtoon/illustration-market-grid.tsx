import Link from "next/link";
import type { IllustrationMarketItem } from "@/actions/webtoon";
import { WEBTOON_GENRE_LABEL } from "@/lib/webtoon/constants";
import { Eye, ShoppingBag } from "lucide-react";

export function IllustrationMarketGrid({ items }: { items: IllustrationMarketItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-12 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">아직 등록된 작품이 없습니다.</p>
        <p className="text-xs text-muted-foreground">
          작가라면{" "}
          <Link href="/webtoon/studio" className="text-[#0096fa] font-semibold hover:underline">
            작품 판매
          </Link>
          에서 그림을 올려 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
      {items.map((item) => (
        <article key={item.id} className="break-inside-avoid mb-3">
          <Link href={`/webtoon/e/${item.id}`} className="group block">
            <div className="relative overflow-hidden rounded-lg border border-border/50 bg-muted/20 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.thumbnailUrl}
                alt=""
                className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                draggable={false}
              />
              {item.price > 0 ? (
                <span className="absolute top-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
                  {item.price.toLocaleString()}원
                </span>
              ) : (
                <span className="absolute top-2 right-2 rounded-md bg-[#0096fa] px-2 py-0.5 text-[10px] font-bold text-white">
                  무료
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1 px-0.5">
              <p className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-[#0096fa] transition-colors">
                {item.title}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">@{item.author.username}</p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                {item.series.genre && (
                  <span className="rounded-full border border-border/60 px-1.5 py-0.5">
                    {WEBTOON_GENRE_LABEL[item.series.genre]}
                  </span>
                )}
                <span className="inline-flex items-center gap-0.5">
                  <ShoppingBag className="h-3 w-3" />
                  {item.salesCount}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Eye className="h-3 w-3" />
                  {item.viewCount}
                </span>
              </div>
            </div>
          </Link>
        </article>
      ))}
    </div>
  );
}
