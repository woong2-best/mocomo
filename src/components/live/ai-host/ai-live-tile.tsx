"use client";

import { AiHostPreviewTile } from "@/components/live/ai-host/ai-host-preview-tile";
import { IDOL_VRM_FALLBACK } from "@/lib/ai-live/idols";
import { IDOL_BACKDROP_DEFAULTS } from "@/lib/ai-live/idol-backdrop-shared";

/** One grid cell that opens the official live. Same size as every other live. */
export function AiLiveTile({ backdropUrl }: { backdropUrl?: string | null }) {
  return (
    <AiHostPreviewTile
      href="/live/zelie"
      vrmUrl={IDOL_VRM_FALLBACK}
      backdropUrl={backdropUrl ?? IDOL_BACKDROP_DEFAULTS.moco}
      posterUrl="/live/moco-poster.png"
      characterId="zelie"
      nameKey="live.aiHostName"
      titleKey="live.aiCardTitle"
    />
  );
}
