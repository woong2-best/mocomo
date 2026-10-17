"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { UsedRegionFilter } from "@/components/used/used-region-filter";
import { UsedSubcultureFilters } from "@/components/used/used-subculture-filters";
import { useLocale } from "@/components/providers/locale-provider";

const PHYSICAL = [
  { id: "FIGURE", key: "market.track.figures" },
  { id: "TCG", key: "market.track.tcg" },
  { id: "GOODS", key: "market.track.goods" },
  { id: "BOOK", key: "market.track.books" },
  { id: "COSPLAY", key: "market.track.cosplay" },
] as const;

const DIGITAL = [
  { id: "VTUBER_3D", key: "market.track.vtuber" },
  { id: "STREAMER_ASSET", key: "market.track.streamer" },
  { id: "EMOTES_BADGES", key: "market.track.emotes" },
  { id: "ILLUSTRATION", key: "market.track.illustration" },
  { id: "AUDIO_MUSIC", key: "market.track.audio" },
  { id: "CREATOR_RESOURCES", key: "market.track.resources" },
] as const;

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
  const trackParam = searchParams.get("track");
  const scope = trackParam === "digital" || trackParam === "physical" ? trackParam : "all";

  return (
    <div
      className={cn(
        "space-y-2 pb-2 -mx-4 px-4 pt-0 border-b border-border/60 transition-opacity",
        isPending && "opacity-60"
      )}
    >
      <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {([
          ["all", "market.track.all"],
          ["physical", "market.scope.physical"],
          ["digital", "market.scope.digital"],
        ] as const).map(([id, key]) => (
          <button
            key={id}
            type="button"
            onClick={() => apply({ track: id === "all" ? null : id, category: null, product: null })}
            className={cn(
              "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold",
              scope === id ? "border-folk-cobalt bg-folk-cobalt text-white" : "border-border bg-card text-folk-cobalt"
            )}
          >
            {t(key)}
          </button>
        ))}
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

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => apply({ category: null, product: null, track: scope === "all" ? null : scope })}
            className={cn(
              "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold",
              !searchParams.get("product") && !searchParams.get("category")
                ? "border-folk-cobalt bg-folk-cobalt text-white"
                : "border-border bg-card text-folk-cobalt"
            )}
          >
            {t("market.track.all")}
          </button>
          {(scope === "digital" ? DIGITAL : scope === "physical" ? PHYSICAL : [...PHYSICAL, ...DIGITAL]).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    apply(
                      "id" in c && DIGITAL.some((item) => item.id === c.id)
                        ? { product: c.id, category: null, track: "digital", mode: null }
                        : { category: c.id, product: null, track: "physical", mode: null }
                    )
                  }
                  className={cn(
                    "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold whitespace-nowrap",
                    searchParams.get("product") === c.id || searchParams.get("category") === c.id
                      ? "border-folk-cobalt bg-folk-cobalt text-white"
                      : "border-border bg-card text-folk-cobalt"
                  )}
                >
                  {t(c.key)}
                </button>
              ))}
        </div>
        {scope !== "digital" ? (
          <UsedRegionFilter
            className="min-w-[8rem] flex-1"
            viewerCountryCode={viewerCountryCode}
            viewerServiceRegion={viewerServiceRegion}
            onNavigate={apply}
            isPending={isPending}
          />
        ) : null}
      </div>

      <UsedSubcultureFilters onNavigate={apply} isPending={isPending} />
    </div>
  );
}
