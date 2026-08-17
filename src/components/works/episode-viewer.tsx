"use client";

import { useEffect } from "react";
import type { CreatorWorkKind } from "@prisma/client";
import { incrementEpisodeView } from "@/actions/webtoon-studio-cloud";
import { PurchaseEpisodeButton } from "@/components/works/purchase-episode-button";
import { ProtectedPaidMedia } from "@/components/media/protected-paid-media";
import { isSalePricedMedia } from "@/lib/paid-media-protection";

type EpisodeViewerProps = {
  kind: CreatorWorkKind;
  title: string;
  episodeId: string;
  price: number;
  owned: boolean;
  locked: boolean;
  visibleUrls: string[];
  videoUrl: string | null;
  previewVideoBlocked: boolean;
  paymentsEnabled: boolean;
};

export function EpisodeViewer({
  kind,
  title,
  episodeId,
  price,
  owned,
  locked,
  visibleUrls,
  videoUrl,
  previewVideoBlocked,
  paymentsEnabled,
}: EpisodeViewerProps) {
  useEffect(() => {
    if (visibleUrls.length > 0) {
      void incrementEpisodeView(episodeId);
    }
  }, [episodeId, visibleUrls.length]);

  return (
    <div className="space-y-4">
      {kind === "VIDEO" && videoUrl && (
        <ProtectedPaidMedia
          type="VIDEO"
          src={videoUrl}
          className="w-full rounded-xl bg-black max-h-[70vh]"
          mediaPriceKrw={price}
          playsInline
          preload="auto"
          controls
          mediaId={episodeId}
          contentKind="EPISODE"
          autoPlayOnView
        />
      )}
      {kind === "VIDEO" && previewVideoBlocked && (
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 p-8 text-center space-y-3">
          <p className="text-sm font-medium">유료 영상입니다</p>
          <PurchaseEpisodeButton
            episodeId={episodeId}
            price={price}
            title={title}
            paymentsEnabled={paymentsEnabled}
          />
        </div>
      )}
      {(kind === "WEBTOON" || kind === "PHOTO") &&
        visibleUrls.map((url, i) =>
          isSalePricedMedia(price) ? (
            <ProtectedPaidMedia
              key={`${url}-${i}`}
              type="IMAGE"
              src={url}
              alt={`${title} ${i + 1}`}
              className="w-full rounded-lg"
              mediaPriceKrw={price}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${url}-${i}`} src={url} alt={`${title} ${i + 1}`} className="w-full rounded-lg" />
          )
        )}
      {locked && (
        <div className="rounded-xl border border-dashed border-folk-cobalt/30 bg-muted/30 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {kind === "WEBTOON" ? "이후 회차는 유료입니다." : "나머지 사진은 구매 후 열람할 수 있습니다."}
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
        <p className="text-xs text-center text-emerald-600 font-medium">구매 완료 · 전체 열람 중</p>
      )}
    </div>
  );
}
