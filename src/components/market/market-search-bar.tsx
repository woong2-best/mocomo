"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function MarketSearchBar({
  initialQuery = "",
  className,
  compact = false,
}: {
  initialQuery?: string;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    const qs = params.toString();
    router.push(qs ? `/market?${qs}` : "/market");
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "flex items-stretch overflow-hidden rounded-xl border-2 border-folk-cobalt/35 bg-background shadow-[2px_3px_0_hsl(var(--folk-cobalt)/0.1)] focus-within:border-folk-terracotta focus-within:shadow-[3px_4px_0_hsl(var(--folk-terracotta)/0.18)] transition-all",
        compact ? "h-11" : "h-12 w-full",
        className
      )}
    >
      {!compact ? (
        <span className="hidden sm:flex items-center px-3 text-xs font-bold text-folk-cobalt/70 border-r border-folk-cobalt/15 shrink-0">
          전체
        </span>
      ) : null}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={compact ? "상품 검색" : "찾고 싶은 상품을 검색해 보세요!"}
        className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground/70"
        name="q"
        autoComplete="off"
      />
      <button
        type="submit"
        className="flex items-center justify-center px-3 sm:px-4 bg-folk-terracotta text-white hover:brightness-110 transition-colors shrink-0"
        aria-label="검색"
      >
        <Search className={cn(compact ? "h-4 w-4" : "h-5 w-5")} strokeWidth={2.5} />
      </button>
    </form>
  );
}
