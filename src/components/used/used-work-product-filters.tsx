"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clapperboard, Package, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { USED_PRODUCT_TYPES, sanitizeWorkTitleInput } from "@/lib/used-catalog";

type UsedWorkProductFiltersProps = {
  onNavigate?: (updates: Record<string, string | null>) => void;
  isPending?: boolean;
};

export function UsedWorkProductFilters({ onNavigate, isPending }: UsedWorkProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workParam = searchParams.get("work") ?? "";
  const productParam = searchParams.get("product") ?? "";

  const [workQuery, setWorkQuery] = useState(workParam);
  const [productQuery, setProductQuery] = useState(productParam);

  useEffect(() => {
    setWorkQuery(workParam);
    setProductQuery(productParam);
  }, [workParam, productParam]);

  function apply(updates: Record<string, string | null>) {
    if (onNavigate) {
      onNavigate(updates);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.replace(`/market?${params.toString()}`);
  }

  function submitDetailedSearch(e: React.FormEvent) {
    e.preventDefault();
    const compact = sanitizeWorkTitleInput(workQuery);
    apply({
      work: compact || null,
      product: productQuery || null,
    });
  }

  function clearDetailed() {
    setWorkQuery("");
    setProductQuery("");
    apply({ work: null, product: null });
  }

  const hasDetailed = !!(workParam || productParam);

  return (
    <section className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          {t("used.s1vqy92q")}
        </h3>
        {hasDetailed && (
          <button
            type="button"
            onClick={clearDetailed}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            {t("used.s1279fdc")}
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground -mt-1">
        {t("used.sbjxsyp")}
      </p>

      <form onSubmit={submitDetailedSearch} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2 md:gap-3 min-w-0">
          <div className="min-w-0">
            <label
              htmlFor="used-work-filter"
              className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1"
            >
              <Clapperboard className="h-3 w-3 shrink-0" />
              {t("used.su9he6")}
            </label>
            <input
              id="used-work-filter"
              type="text"
              value={workQuery}
              onChange={(e) => setWorkQuery(sanitizeWorkTitleInput(e.target.value))}
              placeholder={t("used.s1sfs11g")}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">{t("used.s1v6xjcy")}</p>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="used-product-type"
              className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1"
            >
              <Package className="h-3 w-3 shrink-0" />
              {t("used.s1y6rubw")}
            </label>
            <select
              id="used-product-type"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 appearance-none min-w-0"
            >
              <option value="">{t("used.sqk9ppf")}</option>
              {USED_PRODUCT_TYPES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button
          type="submit"
          variant="secondary"
          className="w-full h-10 rounded-xl text-sm"
          disabled={isPending}
        >
          {t("used.s1vqy92q")}
        </Button>
      </form>

      {hasDetailed && (
        <p className="text-[10px] text-muted-foreground">
          적용 중:{" "}
          {workParam ? t("used.sz40n", { v0: workParam }) : null}
          {workParam && productParam ? " · " : null}
          {productParam
            ? USED_PRODUCT_TYPES.find((p) => p.id === productParam)?.label ?? productParam
            : null}
        </p>
      )}
    </section>
  );
}
