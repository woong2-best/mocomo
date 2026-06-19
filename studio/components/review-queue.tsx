"use client";

import { useTransition } from "react";
import type { StudioAsset, User } from "@prisma/client";
import {
  approveAndPublishStudioAsset,
  approveStudioAsset,
  rejectStudioAsset,
  startReview,
} from "@/studio/actions/review";
import { AssetPreviewViewer } from "./asset-preview-viewer";
import { AssetStatusBadge } from "./asset-status-badge";
import { STUDIO_CATEGORY_LABELS } from "@/studio/lib/constants";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

type Row = StudioAsset & { creator: Pick<User, "id" | "username" | "name" | "image"> };

export function ReviewQueueClient({ items }: { items: Row[] }) {
  const [pending, startTransition] = useTransition();
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  if (!items.length) {
    return <p className="text-muted-foreground">검수 대기 자산이 없습니다.</p>;
  }

  return (
    <div className="space-y-6">
      {items.map((asset) => (
        <div key={asset.id} className="rounded-2xl border border-violet-100 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">{asset.name}</h2>
              <p className="text-sm text-muted-foreground">
                {asset.creator.name ?? asset.creator.username} · {STUDIO_CATEGORY_LABELS[asset.category]}
              </p>
            </div>
            <AssetStatusBadge status={asset.status} />
          </div>

          {asset.glbUrl && (
            <AssetPreviewViewer url={asset.glbUrl} className="mb-4 h-[280px] w-full rounded-xl border" />
          )}

          <div className="flex flex-wrap gap-2">
            {asset.status === "SUBMITTED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => startTransition(async () => { await startReview(asset.id); })}
              >
                검수 시작
              </Button>
            )}
            <Button
              size="sm"
              disabled={pending}
              onClick={() => startTransition(async () => { await approveStudioAsset(asset.id); })}
            >
              승인
            </Button>
            <Button
              size="sm"
              variant="default"
              disabled={pending}
              onClick={() => startTransition(async () => { await approveAndPublishStudioAsset(asset.id); })}
            >
              승인 + 배포
            </Button>
          </div>

          <div className="mt-3 flex gap-2">
            <Textarea
              rows={2}
              placeholder="반려 사유"
              value={rejectReason[asset.id] ?? ""}
              onChange={(e) => setRejectReason((s) => ({ ...s, [asset.id]: e.target.value }))}
            />
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await rejectStudioAsset(asset.id, rejectReason[asset.id] ?? "");
                })
              }
            >
              반려
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
