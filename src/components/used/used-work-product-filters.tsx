"use client";

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
    router.replace(`/used?${params.toString()}`);
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
          상세 검색
        </h3>
        {hasDetailed && (
          <button
            type="button"
            onClick={clearDetailed}
            className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            조건 초기화
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground -mt-1">
        작품(IP) · 상품 종류(피규어 등)로 좁혀 보기
      </p>

      <form onSubmit={submitDetailedSearch} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2 md:gap-3 min-w-0">
          <div className="min-w-0">
            <label
              htmlFor="used-work-filter"
              className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1"
            >
              <Clapperboard className="h-3 w-3 shrink-0" />
              작품명
            </label>
            <input
              id="used-work-filter"
              type="text"
              value={workQuery}
              onChange={(e) => setWorkQuery(sanitizeWorkTitleInput(e.target.value))}
              placeholder="귀멸의칼날"
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">띄어쓰기 없이 입력</p>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="used-product-type"
              className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 mb-1"
            >
              <Package className="h-3 w-3 shrink-0" />
              상품 종류
            </label>
            <select
              id="used-product-type"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 appearance-none min-w-0"
            >
              <option value="">전체 종류</option>
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
          상세 검색
        </Button>
      </form>

      {hasDetailed && (
        <p className="text-[10px] text-muted-foreground">
          적용 중:{" "}
          {workParam ? `작품 ${workParam}` : null}
          {workParam && productParam ? " · " : null}
          {productParam
            ? USED_PRODUCT_TYPES.find((p) => p.id === productParam)?.label ?? productParam
            : null}
        </p>
      )}
    </section>
  );
}
