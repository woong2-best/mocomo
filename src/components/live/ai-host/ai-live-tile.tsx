"use client";

import { AiHostPreviewTile } from "@/components/live/ai-host/ai-host-preview-tile";
import type { AvatarPublicProfile } from "@/lib/ai-live/avatar-profile-shared";
import { IDOL_BACKDROP_DEFAULTS } from "@/lib/ai-live/idol-backdrop-shared";
import { IDOL_VRM_DEFAULTS } from "@/lib/ai-live/idol-vrm-shared";

/** One grid cell that opens the official live. Same size as every other live. */
export function AiLiveTile({
  backdropUrl,
  vrmUrl,
  host,
}: {
  backdropUrl?: string | null;
  vrmUrl?: string | null;
  host?: AvatarPublicProfile | null;
}) {
  return (
    <AiHostPreviewTile
      href="/live/zelie"
      vrmUrl={vrmUrl || IDOL_VRM_DEFAULTS.zelie}
      backdropUrl={backdropUrl ?? IDOL_BACKDROP_DEFAULTS.moco}
      posterUrl="/live/moco-poster.png"
      avatarUrl={host?.image}
      characterId="zelie"
      nameKey="live.aiHostName"
      titleKey="live.aiCardTitle"
      profileUsername={host?.username ?? "zelie"}
      displayName={host?.name}
    />
  );
}
