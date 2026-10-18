"use client";

import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { UsedRegionFilter } from "@/components/used/used-region-filter";
import { UsedSubcultureFilters } from "@/components/used/used-subculture-filters";
import { useLocale } from "@/components/providers/locale-provider";
import {
  DIGITAL_MARKET_CATEGORIES,
  MARKET_LANE_CHIPS,
  PHYSICAL_MARKET_CATEGORIES,
  parseMarketLane,
  parseMarketTrack,
} from "@/lib/market-browse";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UsedSearchHeaderProps = {
  viewerCountryCode: string;
  viewerServiceRegion?: string | null;
  track?: string | null;
  lane?: string | null;
  category?: string | null;
  product?: string | null;
  activeQ?: string | null;
  region?: string | null;
  sido?: string | null;
  condition?: string | null;
  limited?: string | null;
  trade?: string | null;
  work?: string | null;
  anime?: string | null;
};

export function UsedSearchHeader({
  viewerCountryCode,
  viewerServiceRegion,
  track: trackParam,
  lane: laneParam,
  category,
  product,
  activeQ,
  region,
  sido,
  condition,
  limited,
  trade,
  work,
  anime,
}: UsedSearchHeaderProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const lane = parseMarketLane(laneParam);
  const track = parseMarketTrack(trackParam);
  const personal = !!lane;
  const categoryActive = !!(category || product);
  const categories =
    track === "digital"
      ? DIGITAL_MARKET_CATEGORIES
      : track === "physical"
        ? PHYSICAL_MARKET_CATEGORIES
        : [...PHYSICAL_MARKET_CATEGORIES, ...DIGITAL_MARKET_CATEGORIES];

  function apply(updates: Record<string, string | null | undefined>) {
    const params = new URLSearchParams();
    const seed: Record<string, string | null | undefined> = {
      track: track === "all" ? null : track,
      lane,
      category,
      product,
      q: activeQ,
      region,
      sido,
      condition,
      limited,
      trade,
      work,
      anime,
    };
    for (const [key, value] of Object.entries({ ...seed, ...updates })) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/market?${qs}` : "/market");
    });
  }

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold whitespace-nowrap",
      active ? "border-folk-cobalt bg-folk-cobalt text-white" : "border-border bg-card text-folk-cobalt"
    );

  return (
    <div
      className={cn(
        "space-y-2 pb-2 -mx-4 px-4 pt-0 border-b border-border/60 transition-opacity",
        isPending && "opacity-60"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {(
            [
              ["all", "market.track.all"],
              ["physical", "market.scope.physical"],
              ["digital", "market.scope.digital"],
            ] as const
          ).map(([id, key]) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                apply({
                  track: id === "all" ? null : id,
                  lane: null,
                  category: null,
                  product: null,
                })
              }
              className={chip(!personal && track === id)}
            >
              {t(key)}
            </button>
          ))}
          {MARKET_LANE_CHIPS.map((item) => {
            const active = lane === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  apply({
                    lane: active ? null : item.id,
                    category: null,
                    product: null,
                  })
                }
                className={chip(active)}
              >
                {t(item.key)}
              </button>
            );
          })}
        </div>
        {personal ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(chip(categoryActive), "inline-flex items-center gap-1.5 px-3")}
                aria-label={t("common.menu")}
              >
                <Menu className="h-4 w-4" />
                <span className="hidden sm:inline">{t("common.menu")}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[80] max-h-[70vh] w-56 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => apply({ category: null, product: null })}
                className={cn(!categoryActive && "font-extrabold text-folk-cobalt")}
              >
                {t("market.track.all")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {track === "all" ? (
                <>
                  <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                    {t("market.scope.physical")}
                  </p>
                  {PHYSICAL_MARKET_CATEGORIES.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() =>
                        apply({
                          category: c.id,
                          product: null,
                          track: "physical",
                          lane: null,
                        })
                      }
                      className={cn(category === c.id && "font-extrabold text-folk-cobalt")}
                    >
                      {t(c.key)}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
                    {t("market.scope.digital")}
                  </p>
                  {DIGITAL_MARKET_CATEGORIES.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() =>
                        apply({
                          product: c.id,
                          category: null,
                          track: "digital",
                          lane: null,
                        })
                      }
                      className={cn(product === c.id && "font-extrabold text-folk-cobalt")}
                    >
                      {t(c.key)}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : (
                categories.map((c) => {
                  const selected = track === "digital" ? product === c.id : category === c.id;
                  return (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() =>
                        apply(
                          selected
                            ? { category: null, product: null }
                            : track === "digital"
                              ? { product: c.id, category: null, track: "digital" }
                              : { category: c.id, product: null, track: "physical" }
                        )
                      }
                      className={cn(selected && "font-extrabold text-folk-cobalt")}
                    >
                      {t(c.key)}
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {activeQ ? (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <p className="text-[10px] text-muted-foreground">
            {t("ui.search")}{" "}
            <span className="text-foreground font-medium">&quot;{activeQ}&quot;</span>
          </p>
          <button
            type="button"
            onClick={() => apply({ q: null })}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            {t("search.clearAria")}
          </button>
        </div>
      ) : null}

      {personal ? null : (
        <>
          {track !== "digital" ? (
            <UsedRegionFilter
              className="min-w-[8rem]"
              viewerCountryCode={viewerCountryCode}
              viewerServiceRegion={viewerServiceRegion}
              onNavigate={apply}
              isPending={isPending}
            />
          ) : null}
          {track !== "digital" ? <UsedSubcultureFilters onNavigate={apply} isPending={isPending} /> : null}
        </>
      )}
    </div>
  );
}
