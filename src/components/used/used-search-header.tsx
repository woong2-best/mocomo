"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { USED_CATEGORIES, USED_REGIONS } from "@/lib/used-market";

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
    <div className="space-y-3 sticky top-14 z-30 bg-[#FFF9F5] pb-2 -mx-4 px-4 pt-2 border-b border-orange-100/80">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({ q: q.trim() || null });
        }}
        className="flex gap-2"
      >
        <div className="flex-1 flex items-center gap-2 rounded-xl bg-white border border-orange-200/80 px-3 h-11 shadow-sm">
          <Search className="h-4 w-4 text-[#FF6F0F] shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="어떤 상품을 찾으세요?"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 h-11 px-4 rounded-xl bg-[#FF6F0F] text-white text-sm font-semibold"
        >
          검색
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => apply({ category: null })}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
            !searchParams.get("category") ? "bg-[#FF6F0F] text-white" : "bg-white border border-border/60"
          }`}
        >
          전체
        </button>
        {USED_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => apply({ category: c.id })}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              searchParams.get("category") === c.id
                ? "bg-[#FF6F0F] text-white"
                : "bg-white border border-border/60"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <select
        className="w-full h-9 rounded-lg border border-orange-200/60 bg-white text-xs px-2"
        value={searchParams.get("region") ?? ""}
        onChange={(e) => apply({ region: e.target.value || null })}
      >
        <option value="">전체 동네</option>
        {USED_REGIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </div>
  );
}
