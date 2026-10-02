"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useSearchParams } from "next/navigation";
import {
  SUBCULTURE_CONDITION_GRADES,
  SUBCULTURE_LIMITED_KINDS,
  SUBCULTURE_TRADE_MODES,
} from "@/lib/subculture-commerce/types";

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
    <section className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        <select
          value={condition}
          onChange={(e) => apply({ condition: e.target.value || null })}
          className="h-9 min-w-0 rounded-lg border border-border bg-background px-1.5 text-[11px] sm:px-2 sm:text-xs"
          disabled={isPending}
          aria-label={t("used.sxxkr")}
        >
          <option value="">{t("used.s1xg4kgm")}</option>
          {SUBCULTURE_CONDITION_GRADES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={limited}
          onChange={(e) => apply({ limited: e.target.value || null })}
          className="h-9 min-w-0 rounded-lg border border-border bg-background px-1.5 text-[11px] sm:px-2 sm:text-xs"
          disabled={isPending}
          aria-label={t("used.s11e0p")}
        >
          <option value="">{t("used.s13opco")}</option>
          {SUBCULTURE_LIMITED_KINDS.filter((o) => o.id !== "STANDARD").map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={trade}
          onChange={(e) => apply({ trade: e.target.value || null })}
          className="h-9 min-w-0 rounded-lg border border-border bg-background px-1.5 text-[11px] sm:px-2 sm:text-xs"
          disabled={isPending}
          aria-label={t("used.suc6g")}
        >
          <option value="">{t("used.s9vvetl")}</option>
          {SUBCULTURE_TRADE_MODES.filter((o) => o.id !== "SELL").map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hasAny ? (
        <button
          type="button"
          onClick={clearAll}
          className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          {t("used.svz86t4")}
        </button>
      ) : null}
    </section>
  );
}
