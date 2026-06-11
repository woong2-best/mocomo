"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { IllustrationMarketSort } from "@/lib/webtoon/constants";
import { cn } from "@/lib/utils";

const SORTS: { id: IllustrationMarketSort; label: string }[] = [
  { id: "latest", label: "새로 등록" },
  { id: "popular", label: "인기" },
];

export function IllustrationSortBar({ active }: { active: IllustrationMarketSort }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(sort: IllustrationMarketSort) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === "latest") params.delete("sort");
    else params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `/webtoon?${qs}` : "/webtoon");
  }

  return (
    <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 w-fit">
      {SORTS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => navigate(id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
            active === id
              ? "bg-[#0096fa] text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
