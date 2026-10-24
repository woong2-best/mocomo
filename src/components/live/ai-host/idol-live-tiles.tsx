"use client";

import { AiHostPreviewTile } from "@/components/live/ai-host/ai-host-preview-tile";
import { IDOLS, playableIdolVrmUrl } from "@/lib/ai-live/idols";
import {
  backdropSlotForAvatar,
  IDOL_BACKDROP_DEFAULTS,
  type IdolBackdropSlot,
} from "@/lib/ai-live/idol-backdrop-shared";
import { IDOL_VRM_DEFAULTS, type IdolVrmSlot } from "@/lib/ai-live/idol-vrm-shared";

/** Same card chrome as a normal live. VRM + room backdrop match the live room. */
export function IdolLiveTiles({
  backdrops,
  vrms,
}: {
  backdrops?: Partial<Record<IdolBackdropSlot, string | null>>;
  vrms?: Partial<Record<IdolVrmSlot, string | null>>;
}) {
  return (
    <>
      {IDOLS.map((idol) => (
        <AiHostPreviewTile
          key={idol.id}
          href={`/live/${idol.id}`}
          vrmUrl={vrms?.[idol.id] || playableIdolVrmUrl(idol.vrmUrl) || IDOL_VRM_DEFAULTS[idol.id]}
          backdropUrl={
            backdrops?.[backdropSlotForAvatar(idol.id) ?? "airi"] ??
            IDOL_BACKDROP_DEFAULTS[backdropSlotForAvatar(idol.id) ?? "airi"]
          }
          posterUrl={idol.poster}
          avatarUrl={idol.poster}
          characterId={idol.id}
          nameKey={idol.nameKey}
          titleKey={idol.titleKey}
        />
      ))}
    </>
  );
}
