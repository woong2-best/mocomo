"use client";

import { useRouter, useSearchParams } from "next/navigation";
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

type UsedSearchHeaderProps = {
  viewerCountryCode: string;
  viewerServiceRegion?: string | null;
};

export function UsedSearchHeader({
  viewerCountryCode,
  viewerServiceRegion,
}: UsedSearchHeaderProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function apply(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    startTransition(() => {
      router.replace(`/market?${params.toString()}`);
    });
  }

  const activeQ = searchParams.get("q");
  const lane = parseMarketLane(searchParams.get("lane"));
  const track = parseMarketTrack(searchParams.get("track"));
  const categories = track === "digital" ? DIGITAL_MARKET_CATEGORIES : PHYSICAL_MARKET_CATEGORIES;
  const personal = !!lane;

  return (
    <div
      className={cn(
        "space-y-2 pb-2 -mx-4 px-4 pt-0 border-b border-border/60 transition-opacity",
        isPending && "opacity-60"
      )}
    >
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {(["physical", "digital"] as const).map((id) => {
          const active = !personal && track === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() =>
                apply({
                  track: id,
                  lane: null,
                  category: null,
                  product: null,
                })
              }
              className={cn(
                "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold",
                active ? "border-folk-cobalt bg-folk-cobalt text-white" : "border-border bg-card text-folk-cobalt"
              )}
            >
              {t(id === "physical" ? "market.scope.physical" : "market.scope.digital")}
            </button>
          );
        })}
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
              className={cn(
                "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold",
                active ? "border-folk-cobalt bg-folk-cobalt text-white" : "border-border bg-card text-folk-cobalt"
              )}
            >
              {t(item.key)}
            </button>
          );
        })}
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
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {categories.map((c) => {
              const selected =
                track === "digital"
                  ? searchParams.get("product") === c.id
                  : searchParams.get("category") === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    apply(
                      selected
                        ? { category: null, product: null, track }
                        : track === "digital"
                          ? { product: c.id, category: null, track: "digital", mode: null }
                          : { category: c.id, product: null, track: "physical", mode: null }
                    )
                  }
                  className={cn(
                    "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold whitespace-nowrap",
                    selected
                      ? "border-folk-cobalt bg-folk-cobalt text-white"
                      : "border-border bg-card text-folk-cobalt"
                  )}
                >
                  {t(c.key)}
                </button>
              );
            })}
          </div>
          {track !== "digital" ? (
            <UsedRegionFilter
              className="min-w-[8rem] flex-1"
              viewerCountryCode={viewerCountryCode}
              viewerServiceRegion={viewerServiceRegion}
              onNavigate={apply}
              isPending={isPending}
            />
          ) : null}
        </div>
      )}

      {personal ? null : <UsedSubcultureFilters onNavigate={apply} isPending={isPending} />}
    </div>
  );
}
