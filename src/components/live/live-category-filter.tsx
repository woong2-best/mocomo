"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LIVE_CATEGORIES } from "@/lib/live-categories";
import { cn } from "@/lib/utils";

export function LiveCategoryFilter() {
  const searchParams = useSearchParams();
  const current = searchParams.get("category") ?? "ALL";

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {LIVE_CATEGORIES.map(({ value, label }) => {
        const active = current === value || (value === "ALL" && !searchParams.get("category"));
        const href = value === "ALL" ? "/live" : `/live?category=${value}`;
        return (
          <Link
            key={value}
            href={href}
            scroll={false}
            className={cn(
              "shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-full border font-medium transition-colors",
              active
                ? "bg-red-600 text-white border-red-600"
                : "bg-background/80 border-border text-muted-foreground hover:border-red-500/40"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
