"use client";

import { useEffect, useState } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import type { WatermarkContentKind } from "@/lib/paid-media-playback";
import {
  emitForensicCanvasEvent,
  getForensicPipelineRecorder,
} from "@/lib/watermark/client/forensic-diagnostics";

export type ForensicClientVerification = {
  opaqueWatermarkId: string;
  contentId: string;
};

export function useForensicWatermarkSession(
  mediaId: string | null | undefined,
  enabled: boolean,
  contentKind: WatermarkContentKind = "POST_MEDIA"
) {
  const [config, setConfig] = useState<ForensicRenderConfig | null>(null);
  const [clientVerification, setClientVerification] =
    useState<ForensicClientVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const recorder = getForensicPipelineRecorder(mediaId ?? null);
    recorder.bindMedia(mediaId ?? null);

    if (!enabled || !mediaId) {
      setConfig(null);
      setClientVerification(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    recorder.record({ stage: "SESSION_LOADING", mediaId });

    void (async () => {
      try {
        const res = await fetch("/api/watermark/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: mediaId, contentKind }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message = data.error ?? "Watermark session unavailable";
          if (!cancelled) {
            setError(message);
            recorder.record({
              stage: "SESSION_FAILED",
              mediaId,
              error: message,
            });
            emitForensicCanvasEvent({
              phase: "SESSION_FAILED",
              mediaId: mediaId ?? undefined,
              message,
            });
          }
          return;
        }
        const renderConfig = data.renderConfig ?? null;
        const verification = data.clientVerification ?? null;
        if (!cancelled) {
          setConfig(renderConfig);
          setClientVerification(
            verification?.opaqueWatermarkId && verification?.contentId
              ? {
                  opaqueWatermarkId: verification.opaqueWatermarkId,
                  contentId: verification.contentId,
                }
              : null
          );
        }
        if (!cancelled && renderConfig) {
          recorder.setSessionMeta({
            sessionId: data.sessionId ?? renderConfig.sessionId,
            opaqueWatermarkId: verification?.opaqueWatermarkId ?? null,
          });
          recorder.record({
            stage: "SESSION_READY",
            mediaId,
            sessionId: data.sessionId ?? renderConfig.sessionId,
          });
          emitForensicCanvasEvent({
            phase: "SESSION_LOADED",
            mediaId: mediaId ?? undefined,
            sessionId: data.sessionId ?? renderConfig.sessionId,
          });
        }
      } catch {
        const message = "Watermark session request failed";
        if (!cancelled) {
          setError(message);
          recorder.record({ stage: "SESSION_FAILED", mediaId, error: message });
          emitForensicCanvasEvent({
            phase: "SESSION_FAILED",
            mediaId: mediaId ?? undefined,
            message,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, mediaId, contentKind]);

  return { config, clientVerification, loading, error };
}
