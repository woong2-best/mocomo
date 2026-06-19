import Link from "next/link";
import { Suspense } from "react";
import { listPublishedAssets } from "@/studio/actions/market";
import { AssetCard } from "@/studio/components/asset-card";
import { MarketSearchForm } from "@/studio/components/market-search-form";
import { STUDIO_CATEGORIES, STUDIO_CATEGORY_LABELS } from "@/studio/lib/constants";
import type { StudioAssetCategory } from "@prisma/client";

export default async function StudioMarketPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const category = STUDIO_CATEGORIES.includes(sp.category as StudioAssetCategory)
    ? (sp.category as StudioAssetCategory)
    : undefined;
  const assets = await listPublishedAssets({ category, q: sp.q, take: 48 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold">Asset Marketplace</h1>
        <Suspense fallback={null}>
          <MarketSearchForm />
        </Suspense>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/studio/market"
          className={`rounded-full px-3 py-1 text-sm ${!category ? "bg-pink-100 text-pink-700" : "border bg-white"}`}
        >
          전체
        </Link>
        {STUDIO_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/studio/market?category=${c}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}
            className={`rounded-full px-3 py-1 text-sm ${
              category === c ? "bg-pink-100 text-pink-700" : "border bg-white"
            }`}
          >
            {STUDIO_CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <AssetCard key={a.id} asset={a} href={`/studio/market/${a.id}`} />
        ))}
      </div>
      {!assets.length && <p className="text-muted-foreground">표시할 자산이 없습니다.</p>}
    </div>
  );
}
