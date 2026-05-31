"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { USED_CATEGORIES } from "@/lib/used-market";
import { UsedRegionFilter } from "@/components/used/used-region-filter";

export function UsedSearchHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function apply(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`/used?${params.toString()}`);
  }

  return (
    <div className="space-y-3 sticky top-14 z-30 bg-background/95 backdrop-blur pb-2 -mx-4 px-4 pt-1 border-b border-border">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() || null });
        }}
        className="flex gap-2"
      >
        <div className="flex-1 flex items-center gap-2 rounded-xl bg-muted/50 border border-border px-3 h-11">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="어떤 상품을 찾으세요?"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Button type="submit" variant="secondary" size="default" className="h-11 shrink-0">
          검색
        </Button>
      </form>

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
            onClick={() => apply({ category: c.id })}
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

      <UsedRegionFilter />
    </div>
  );
}
