"use client";

import { AiHostPreviewTile } from "@/components/live/ai-host/ai-host-preview-tile";
import type { AvatarPublicProfile } from "@/lib/ai-live/avatar-profile-shared";
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
  hosts,
}: {
  backdrops?: Partial<Record<IdolBackdropSlot, string | null>>;
  vrms?: Partial<Record<IdolVrmSlot, string | null>>;
  hosts?: Partial<Record<"cleo" | "mio" | "nangnang", AvatarPublicProfile>>;
}) {
  return (
    <>
      {IDOLS.map((idol) => {
        const host = hosts?.[idol.id];
        return (
          <AiHostPreviewTile
            key={idol.id}
            href={`/live/${idol.id}`}
            vrmUrl={vrms?.[idol.id] || playableIdolVrmUrl(idol.vrmUrl) || IDOL_VRM_DEFAULTS[idol.id]}
            backdropUrl={
              backdrops?.[backdropSlotForAvatar(idol.id) ?? "airi"] ??
              IDOL_BACKDROP_DEFAULTS[backdropSlotForAvatar(idol.id) ?? "airi"]
            }
            posterUrl={idol.poster}
            avatarUrl={host?.image}
            characterId={idol.id}
            nameKey={idol.nameKey}
            titleKey={idol.titleKey}
            profileUsername={host?.username ?? idol.username}
            displayName={host?.name}
          />
        );
      })}
    </>
  );
}
