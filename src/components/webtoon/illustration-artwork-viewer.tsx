"use client";

import { useEffect } from "react";
import { incrementEpisodeView } from "@/actions/webtoon-studio-cloud";
import { PurchaseEpisodeButton } from "@/components/works/purchase-episode-button";
import { cn } from "@/lib/utils";

type IllustrationArtworkViewerProps = {
  title: string;
  episodeId: string;
  price: number;
  owned: boolean;
  locked: boolean;
  visibleUrls: string[];
  paymentsEnabled: boolean;
};

/** 픽시브 스타일 — 단일/다중 일러스트 열람 + 구매 */
export function IllustrationArtworkViewer({
  title,
  episodeId,
  price,
  owned,
  locked,
  visibleUrls,
  paymentsEnabled,
}: IllustrationArtworkViewerProps) {
  useEffect(() => {
    if (visibleUrls.length > 0) {
      void incrementEpisodeView(episodeId);
    }
  }, [episodeId, visibleUrls.length]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {visibleUrls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className={cn(
              "relative overflow-hidden rounded-xl border border-border/50 bg-muted/10",
              locked && i === visibleUrls.length - 1 && "ring-2 ring-[#0096fa]/30"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${title} ${i + 1}`}
              className="mx-auto w-full max-h-[75vh] object-contain bg-black/5"
              draggable={false}
            />
            {locked && i === visibleUrls.length - 1 && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-16 text-center">
                <p className="text-sm font-medium text-white">고해상도 · 전체 이미지는 구매 후 열람</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {locked && (
        <div className="rounded-xl border border-[#0096fa]/30 bg-[#0096fa]/5 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            이 작품을 구매하면 원본 화질 전체를 다운로드·열람할 수 있습니다.
          </p>
          <PurchaseEpisodeButton
            episodeId={episodeId}
            price={price}
            title={title}
            paymentsEnabled={paymentsEnabled}
          />
        </div>
      )}

      {owned && price > 0 && (
        <p className="text-xs text-center text-[#0096fa] font-semibold">구매 완료 · 전체 작품 열람 중</p>
      )}
      {owned && price <= 0 && (
        <p className="text-xs text-center text-muted-foreground">무료 공개 작품</p>
      )}
    </div>
  );
}
