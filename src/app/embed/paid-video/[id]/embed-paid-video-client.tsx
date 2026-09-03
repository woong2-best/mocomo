"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FeedVideoPlayer } from "@/components/media/feed-video-player";
import { ForensicImageCanvas } from "@/components/media/forensic-image-canvas";
import { useForensicWatermarkSession } from "@/components/media/use-forensic-watermark-session";
import { PaidMediaProtectionShell } from "@/components/media/paid-media-protection-shell";
import {
  paidEpisodePlaybackPath,
  paidMediaPlaybackPath,
  paidMessageAttachmentPlaybackPath,
  type WatermarkContentKind,
} from "@/lib/paid-media-playback";

type Props = {
  params: Promise<{ id: string }>;
};

function contentKindFromQuery(kind: string | null): WatermarkContentKind {
  if (kind === "episode") return "EPISODE";
  if (kind === "message") return "MESSAGE_ATTACHMENT";
  return "POST_MEDIA";
}

function playbackPath(id: string, contentKind: WatermarkContentKind): string {
  if (contentKind === "EPISODE") return paidEpisodePlaybackPath(id);
  if (contentKind === "MESSAGE_ATTACHMENT") return paidMessageAttachmentPlaybackPath(id);
  return paidMediaPlaybackPath(id);
}

/**
 * Native-app handoff surface. The app opens this in an authenticated WebView so
 * mobile paid playback carries the exact same forensic pipeline as the website.
 */
export default function EmbedPaidVideoClient({ params }: Props) {
  const searchParams = useSearchParams();
  const [mediaId, setMediaId] = useState<string | null>(null);
  const contentKind = contentKindFromQuery(searchParams.get("kind"));
  const isImage = searchParams.get("type") === "image";
  const [canvasFailed, setCanvasFailed] = useState(false);

  useEffect(() => {
    void params.then((p) => setMediaId(p.id));
  }, [params]);

  const src = mediaId == null ? "" : playbackPath(mediaId, contentKind);

  const { config, clientVerification, loading, error: sessionError } =
    useForensicWatermarkSession(mediaId, Boolean(mediaId), contentKind);

  if (!mediaId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black text-white/70">
        Loading…
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black px-6 text-center text-sm text-red-300">
        {sessionError}
      </div>
    );
  }

  if (isImage) {
    const ready =
      Boolean(config) &&
      Boolean(clientVerification?.opaqueWatermarkId) &&
      Boolean(clientVerification?.expectedIntegrityB64) &&
      !canvasFailed;
    return (
      <PaidMediaProtectionShell className="min-h-dvh w-full bg-black">
        <div className="flex min-h-dvh w-full items-center justify-center bg-black">
          {ready && config ? (
            <ForensicImageCanvas
              src={src}
              mediaId={mediaId}
              objectFit="contain"
              fillParent
              className="size-full"
              config={config}
              clientVerification={clientVerification}
              onFailed={() => setCanvasFailed(true)}
            />
          ) : (
            <p className="px-6 text-center text-sm text-white/70">
              {canvasFailed
                ? "워터마크 적용에 실패했습니다. 다시 시도해 주세요."
                : "불러오는 중…"}
            </p>
          )}
        </div>
      </PaidMediaProtectionShell>
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
        forensicSessionFailed={Boolean(sessionError)}
      />
    </div>
  );
}
