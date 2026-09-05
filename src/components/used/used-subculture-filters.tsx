"use client";

import { useSearchParams } from "next/navigation";
import {
  SUBCULTURE_CONDITION_GRADES,
  SUBCULTURE_LIMITED_KINDS,
  SUBCULTURE_TRADE_MODES,
} from "@/lib/subculture-commerce/types";
import { Button } from "@/components/ui/button";

type Props = {
  onNavigate?: (updates: Record<string, string | null>) => void;
  isPending?: boolean;
};

export function UsedSubcultureFilters({ onNavigate, isPending }: Props) {
  const searchParams = useSearchParams();
  const condition = searchParams.get("condition") ?? "";
  const limited = searchParams.get("limited") ?? "";
  const trade = searchParams.get("trade") ?? "";

  function apply(updates: Record<string, string | null>) {
    onNavigate?.(updates);
  }

  function clearAll() {
    apply({ condition: null, limited: null, trade: null });
  }

  const hasAny = !!(condition || limited || trade);

  return (
    <section className="rounded-xl border border-border/80 bg-muted/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">서브컬처 필터</h3>
        {hasAny && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            초기화
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={condition}
          onChange={(e) => apply({ condition: e.target.value || null })}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
          disabled={isPending}
        >
          <option value="">상태 (전체)</option>
          {SUBCULTURE_CONDITION_GRADES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={limited}
          onChange={(e) => apply({ limited: e.target.value || null })}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
          disabled={isPending}
        >
          <option value="">한정 (전체)</option>
          {SUBCULTURE_LIMITED_KINDS.filter((o) => o.id !== "STANDARD").map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={trade}
          onChange={(e) => apply({ trade: e.target.value || null })}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs"
          disabled={isPending}
        >
          <option value="">거래 (전체)</option>
          {SUBCULTURE_TRADE_MODES.filter((o) => o.id !== "SELL").map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hasAny && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full h-8 text-xs"
          disabled={isPending}
          onClick={() => apply({})}
        >
          필터 적용됨 · 목록 새로고침 중…
        </Button>
      )}
    </section>
  );
}
