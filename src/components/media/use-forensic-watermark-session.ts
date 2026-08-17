"use client";

import { useEffect, useState } from "react";
import type { ForensicRenderConfig } from "@/lib/watermark/types";
import type { WatermarkContentKind } from "@/lib/paid-media-playback";

export function useForensicWatermarkSession(
  mediaId: string | null | undefined,
  enabled: boolean,
  contentKind: WatermarkContentKind = "POST_MEDIA"
) {
  const [config, setConfig] = useState<ForensicRenderConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !mediaId) {
      setConfig(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch("/api/watermark/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentId: mediaId, contentKind }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Watermark session unavailable");
          return;
        }
        if (!cancelled) setConfig(data.renderConfig ?? null);
      } catch {
        if (!cancelled) setError("Watermark session request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, mediaId, contentKind]);

  return { config, loading, error };
}
