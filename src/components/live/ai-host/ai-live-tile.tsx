"use client";

import { AiHostPreviewTile } from "@/components/live/ai-host/ai-host-preview-tile";
import { IDOL_BACKDROP_DEFAULTS } from "@/lib/ai-live/idol-backdrop-shared";
import { IDOL_VRM_DEFAULTS } from "@/lib/ai-live/idol-vrm-shared";

/** One grid cell that opens the official live. Same size as every other live. */
export function AiLiveTile({
  backdropUrl,
  vrmUrl,
}: {
  backdropUrl?: string | null;
  vrmUrl?: string | null;
}) {
  return (
    <AiHostPreviewTile
      href="/live/zelie"
      vrmUrl={vrmUrl || IDOL_VRM_DEFAULTS.zelie}
      backdropUrl={backdropUrl ?? IDOL_BACKDROP_DEFAULTS.moco}
      posterUrl="/live/moco-poster.png"
      characterId="zelie"
      nameKey="live.aiHostName"
      titleKey="live.aiCardTitle"
    />
  );
}
