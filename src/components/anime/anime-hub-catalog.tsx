import Link from "next/link";
import { animeSlugFromTitle, isValidAnimeSlug } from "@/lib/utils";

export type AnimeHubCatalogItem = {
  id: string;
  slug: string;
  title: string;
  titleEn: string | null;
  coverUrl: string | null;
  genreEmoji: string;
  creatorUsername: string;
};

export function AnimeHubCatalog({
  items,
  emptyTitle,
  emptyHint,
  emptyLinkHref,
  emptyLinkLabel,
}: {
  items: AnimeHubCatalogItem[];
  emptyTitle: string;
  emptyHint: string;
  emptyLinkHref: string;
  emptyLinkLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-12 text-center space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{emptyTitle}</p>
        <p className="text-xs text-muted-foreground">
          {emptyHint}{" "}
          <Link href={emptyLinkHref} className="text-[#0096fa] font-semibold hover:underline">
            {emptyLinkLabel}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">
      {items.map((item) => {
        const href = isValidAnimeSlug(item.slug)
          ? `/anime/${item.slug}`
          : `/anime/${animeSlugFromTitle(item.title, item.titleEn)}`;
        return (
          <article key={item.id} className="break-inside-avoid mb-3">
            <Link href={href} className="group block">
              <div className="relative overflow-hidden rounded-lg border border-border/50 bg-muted/20 shadow-sm">
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt=""
                    className="w-full aspect-[3/4] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full aspect-[3/4] flex items-center justify-center text-4xl bg-muted/30">
                    {item.genreEmoji}
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-0.5 px-0.5">
                <p className="text-xs font-semibold leading-snug line-clamp-2 group-hover:text-[#0096fa] transition-colors">
                  {item.title}
                </p>
                {item.titleEn ? (
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{item.titleEn}</p>
                ) : null}
                <p className="text-[10px] text-muted-foreground truncate">@{item.creatorUsername}</p>
              </div>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
