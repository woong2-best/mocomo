"use client";

import { MarketQuickActions } from "@/components/market/market-quick-actions";
import { cn } from "@/lib/utils";

export function MarketToolbar({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-stretch justify-end gap-2", className)}>
      <MarketQuickActions />
    </div>
  );
}
