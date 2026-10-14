import Link from "next/link";
import { createTranslator } from "@/lib/i18n/messages";
import type { UsedQueryFacet } from "@/lib/used-market-query";
import { cn } from "@/lib/utils";

const t = createTranslator("en");

function marketHref(preserved: Record<string, string>, category: string | null) {
  const params = new URLSearchParams(preserved);
  if (category) params.set("category", category);
  else params.delete("category");
  const qs = params.toString();
  return qs ? `/market?${qs}` : "/market";
}

export function UsedQueryCategories({
  facets,
  activeCategory,
  preserved,
}: {
  facets: UsedQueryFacet[];
  activeCategory?: string | null;
  preserved: Record<string, string>;
}) {
  if (facets.length === 0) return null;

  return (
    <aside className="lg:sticky lg:top-20 lg:w-52 lg:shrink-0">
      <p className="px-1 pb-2 text-xs font-extrabold text-foreground">{t("used.query.categories")}</p>
      <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        <li className="shrink-0 lg:shrink">
          <Link
            href={marketHref(preserved, null)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-extrabold lg:w-full lg:rounded-xl",
              !activeCategory
                ? "border-folk-cobalt bg-folk-cobalt text-white"
                : "border-border bg-card text-folk-cobalt"
            )}
          >
            <span className="truncate">{t("used.query.allMatches")}</span>
          </Link>
        </li>
        {facets.map((facet) => {
          const active = activeCategory === facet.id;
          return (
            <li key={facet.id} className="shrink-0 lg:shrink">
              <Link
                href={marketHref(preserved, facet.id)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-full border-[1.5px] px-3 py-1.5 text-[13px] font-extrabold lg:w-full lg:rounded-xl",
                  active
                    ? "border-folk-cobalt bg-folk-cobalt text-white"
                    : "border-border bg-card text-folk-cobalt"
                )}
              >
                <span className="truncate">{facet.label.split(" / ")[0]}</span>
                <span className={cn("tabular-nums text-[11px]", active ? "text-white/80" : "text-muted-foreground")}>
                  {facet.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
