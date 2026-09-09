"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { USED_CATEGORIES } from "@/lib/used-market";
import { UsedRegionFilter } from "@/components/used/used-region-filter";
import { UsedWorkProductFilters } from "@/components/used/used-work-product-filters";
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
      router.replace(`/used?${params.toString()}`);
    });
  }

  const activeQ = searchParams.get("q");

  return (
    <div
      className={cn(
        "space-y-3 pb-2 -mx-4 px-4 pt-1 border-b border-border transition-opacity",
        isPending && "opacity-60"
      )}
    >
      {activeQ ? (
        <div className="flex items-center justify-between gap-2 pt-1">
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

      <UsedWorkProductFilters onNavigate={apply} isPending={isPending} />

      <UsedSubcultureFilters onNavigate={apply} isPending={isPending} />

      <section className="space-y-2">
        <h3 className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
          <LayoutGrid className="h-3 w-3" />
          카테고리 · 경매
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => apply({ category: null, mode: null })}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium",
              !searchParams.get("category") && searchParams.get("mode") !== "auction"
                ? "bg-foreground text-background"
                : "bg-muted border border-border"
            )}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => apply({ mode: "auction", category: null })}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
              searchParams.get("mode") === "auction"
                ? "bg-orange-600 text-white"
                : "bg-muted border border-border"
            )}
          >
            🔨 경매
          </button>
          {USED_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                if (c.id === "COSPLAY") {
                  startTransition(() => {
                    router.push("/cosplay");
                  });
                  return;
                }
                apply({ category: c.id });
              }}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap",
                searchParams.get("category") === c.id
                  ? "bg-foreground text-background"
                  : "bg-muted border border-border"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <UsedRegionFilter
        viewerCountryCode={viewerCountryCode}
        viewerServiceRegion={viewerServiceRegion}
        onNavigate={apply}
        isPending={isPending}
      />
    </div>
  );
}
