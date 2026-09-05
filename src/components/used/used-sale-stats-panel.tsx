"use client";

import { useEffect, useState } from "react";
import { formatUsedPrice } from "@/lib/used-market";

type SaleRecord = {
  id: string;
  soldPrice: number;
  currency: string;
  soldAt: string;
  listingFormat: string | null;
  characterName: string | null;
  productType: string | null;
};

export function UsedSaleStatsPanel({
  workTitle,
  animeSlug,
  productType,
  characterName,
}: {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
  characterName?: string | null;
}) {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [median, setMedian] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!workTitle && !animeSlug && !productType) {
      setLoaded(true);
      return;
    }
    const params = new URLSearchParams();
    if (animeSlug) params.set("anime", animeSlug);
    else if (workTitle) params.set("work", workTitle);
    if (productType) params.set("product", productType);
    if (characterName) params.set("character", characterName);

    let alive = true;
    void fetch(`/api/subculture/sales?${params}`)
      .then((r) => r.json())
      .then((data: { records?: SaleRecord[]; median?: number | null }) => {
        if (!alive) return;
        setRecords(data.records ?? []);
        setMedian(data.median ?? null);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [workTitle, animeSlug, productType, characterName]);

  if (!loaded || records.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">최근 거래가</h2>
        {median != null && records[0] && (
          <p className="text-xs text-muted-foreground">
            중앙값{" "}
            <span className="font-semibold text-foreground">
              {formatUsedPrice(median, records[0].currency)}
            </span>
          </p>
        )}
      </div>
      <ul className="space-y-1.5">
        {records.slice(0, 5).map((r) => (
          <li key={r.id} className="flex justify-between text-xs">
            <span className="text-muted-foreground truncate pr-2">
              {new Date(r.soldAt).toLocaleDateString("ko-KR")}
              {r.characterName ? ` · ${r.characterName}` : ""}
            </span>
            <span className="font-semibold shrink-0">
              {formatUsedPrice(r.soldPrice, r.currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
