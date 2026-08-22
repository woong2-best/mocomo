"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FeedVideoPlayer } from "@/components/media/feed-video-player";
import { useForensicWatermarkSession } from "@/components/media/use-forensic-watermark-session";
import {
  forensicPlaybackReady,
  useForensicViewReady,
} from "@/components/media/use-forensic-view-ready";
import {
  paidEpisodePlaybackPath,
  paidMediaPlaybackPath,
  type WatermarkContentKind,
} from "@/lib/paid-media-playback";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EmbedPaidVideoClient({ params }: Props) {
  const searchParams = useSearchParams();
  const [mediaId, setMediaId] = useState<string | null>(null);
  const kindParam = searchParams.get("kind");
  const contentKind: WatermarkContentKind =
    kindParam === "episode" ? "EPISODE" : "POST_MEDIA";

  useEffect(() => {
    void params.then((p) => setMediaId(p.id));
  }, [params]);

  const src =
    mediaId == null
      ? ""
      : contentKind === "EPISODE"
        ? paidEpisodePlaybackPath(mediaId)
        : paidMediaPlaybackPath(mediaId);

  const { viewReady, markViewReady } = useForensicViewReady(Boolean(mediaId), mediaId ?? "", {
    autoAfterMs: undefined,
  });
  const { config, loading, error } = useForensicWatermarkSession(
    mediaId,
    Boolean(mediaId),
    contentKind,
    viewReady
  );

  if (!mediaId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-white/70">
        Loading…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black px-6 text-center text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh bg-black">
      <FeedVideoPlayer
        src={src}
        className="h-dvh w-full object-contain"
        muted={false}
        playsInline
        controls
        protect
        mediaId={mediaId}
        autoPlayOnView
        forensicRenderConfig={loading ? null : config}
        onForensicViewReady={markViewReady}
      />
    </div>
  );
}
