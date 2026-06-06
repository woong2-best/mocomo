"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { LIVE_CATEGORIES } from "@/lib/live-categories";
import { cn } from "@/lib/utils";

export function LiveCategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = searchParams.get("category") ?? "ALL";

  function goCategory(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") params.delete("category");
    else params.set("category", value);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/live?${qs}` : "/live", { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1 transition-opacity",
        pending && "opacity-70"
      )}
    >
      {LIVE_CATEGORIES.map(({ value, label }) => {
        const active = current === value || (value === "ALL" && !searchParams.get("category"));
        return (
          <button
            key={value}
            type="button"
            onClick={() => goCategory(value)}
            className={cn(
              "shrink-0 text-xs sm:text-sm px-3 py-1.5 rounded-full border font-medium transition-colors",
              active
                ? "bg-folk-terracotta text-white border-folk-terracotta"
                : "bg-background/80 border-border text-muted-foreground hover:border-folk-terracotta/40"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
