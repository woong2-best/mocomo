"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { purchaseStudioAsset, toggleStudioAssetLike } from "@/studio/actions/market";
import { downloadStudioAsset } from "@/studio/actions/assets";
import type { StudioAsset, User } from "@prisma/client";
import { AssetPreviewViewer } from "./asset-preview-viewer";
import { STUDIO_CATEGORY_LABELS } from "@/studio/lib/constants";
import { Button } from "@/components/ui/button";

type Props = {
  asset: StudioAsset & { creator: Pick<User, "id" | "username" | "name" | "image"> };
  liked?: boolean;
  purchased?: boolean;
  isOwner?: boolean;
};

export function MarketAssetActions({ asset, liked, purchased, isOwner }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => { await toggleStudioAssetLike(asset.id); router.refresh(); })}
      >
        {liked ? "♥ 좋아요 취소" : "♡ 좋아요"} ({asset.likeCount})
      </Button>

      {!isOwner && !asset.isFree && asset.priceKrw > 0 && !purchased && (
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await purchaseStudioAsset(asset.id);
              if (!r.error) router.refresh();
            })
          }
        >
          {asset.priceKrw.toLocaleString()}원 구매
        </Button>
      )}

      {(asset.isFree || purchased || isOwner) && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await downloadStudioAsset(asset.id);
              if (r.url) window.open(r.url, "_blank");
            })
          }
        >
          다운로드
        </Button>
      )}
    </div>
  );
}

export function MarketAssetDetail({
  asset,
  liked,
  purchased,
  isOwner,
}: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {asset.glbUrl ? (
        <AssetPreviewViewer url={asset.glbUrl} className="h-[420px] w-full rounded-2xl border border-pink-100" />
      ) : null}
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-semibold text-pink-700">{asset.name}</h1>
        <p className="text-sm text-muted-foreground">{STUDIO_CATEGORY_LABELS[asset.category]}</p>
        <p className="text-2xl font-bold text-pink-600">
          {asset.isFree || asset.priceKrw <= 0 ? "무료" : `${asset.priceKrw.toLocaleString()}원`}
        </p>
        {asset.description && <p>{asset.description}</p>}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.map((t) => (
              <span key={t} className="rounded-full bg-pink-100 px-2 py-0.5 text-xs text-pink-700">
                #{t}
              </span>
            ))}
          </div>
        )}
        <MarketAssetActions asset={asset} liked={liked} purchased={purchased} isOwner={isOwner} />
        <p className="text-xs text-muted-foreground">
          다운로드 {asset.downloadCount} · 판매 {asset.saleCount}
        </p>
      </div>
    </div>
  );
}
