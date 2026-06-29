"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Mic2, Video } from "lucide-react";
import { LIVE_CATEGORIES } from "@/lib/live-categories";
import { cn } from "@/lib/utils";
import type { LiveHubMode } from "@/lib/live-hub-mode";

const MODE_TABS: { value: LiveHubMode; label: string; icon?: typeof Video }[] = [
  { value: "all", label: "전체" },
  { value: "video", label: "영상", icon: Video },
  { value: "voice", label: "보이스", icon: Mic2 },
];

export function LiveCategoryFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = searchParams.get("category") ?? "ALL";
  const currentMode = (searchParams.get("mode") ?? "all") as LiveHubMode;

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/live?${qs}` : "/live", { scroll: false });
    });
  }

  function goCategory(value: string) {
    pushParams((params) => {
      if (value === "ALL") params.delete("category");
      else params.set("category", value);
    });
  }

  function goMode(value: LiveHubMode) {
    pushParams((params) => {
      if (value === "all") params.delete("mode");
      else params.set("mode", value);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 p-1 rounded-xl bg-muted/40 border w-fit max-w-full">
        {MODE_TABS.map(({ value, label, icon: Icon }) => {
          const active = currentMode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => goMode(value)}
              className={cn(
                "shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors",
                active ? "bg-background shadow text-foreground" : "text-muted-foreground"
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {label}
            </button>
          );
        })}
      </div>
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
    </div>
  );
}
