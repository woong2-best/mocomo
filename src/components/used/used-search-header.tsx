"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { USED_MARKET_BROWSE_CATEGORIES } from "@/lib/used-market";
import { UsedRegionFilter } from "@/components/used/used-region-filter";
import { UsedSubcultureFilters } from "@/components/used/used-subculture-filters";

type UsedSearchHeaderProps = {
  viewerCountryCode: string;
  viewerServiceRegion?: string | null;
};

export function UsedSearchHeader({
  viewerCountryCode,
  viewerServiceRegion,
}: UsedSearchHeaderProps) {
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

  return (
    <div
      className={cn(
        "space-y-2 pb-2 -mx-4 px-4 pt-0 border-b border-border/60 transition-opacity",
        isPending && "opacity-60"
      )}
    >
      {activeQ ? (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <p className="text-[10px] text-muted-foreground">
            검색: <span className="text-foreground font-medium">&quot;{activeQ}&quot;</span>
          </p>
          <button
            type="button"
            onClick={() => apply({ q: null })}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            검색어 지우기
          </button>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => apply({ category: null, mode: null })}
          className={cn(
            "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold",
            !searchParams.get("category") && searchParams.get("mode") !== "auction"
              ? "border-folk-cobalt bg-folk-cobalt text-white"
              : "border-border bg-card text-folk-cobalt"
          )}
        >
          전체
        </button>
        <button
          type="button"
          onClick={() => apply({ mode: "auction", category: null })}
          className={cn(
            "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold whitespace-nowrap",
            searchParams.get("mode") === "auction"
              ? "border-folk-terracotta bg-folk-terracotta text-white"
              : "border-border bg-card text-folk-cobalt"
          )}
        >
          경매
        </button>
        {USED_MARKET_BROWSE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => apply({ category: c.id, mode: null })}
            className={cn(
              "shrink-0 rounded-full border-[1.5px] px-3.5 py-2 text-[13px] font-extrabold whitespace-nowrap",
              searchParams.get("category") === c.id
                ? "border-folk-cobalt bg-folk-cobalt text-white"
                : "border-border bg-card text-folk-cobalt"
            )}
          >
            {c.label.split(" / ")[0]}
          </button>
        ))}
      </div>

      <UsedRegionFilter
        viewerCountryCode={viewerCountryCode}
        viewerServiceRegion={viewerServiceRegion}
        onNavigate={apply}
        isPending={isPending}
      />

      <UsedSubcultureFilters onNavigate={apply} isPending={isPending} />
    </div>
  );
}
