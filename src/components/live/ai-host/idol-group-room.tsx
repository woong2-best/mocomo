"use client";

import { MocoLiveRoom } from "@/components/live/ai-host/moco-live-room";
import { IDOLS, idolById, playableIdolVrmUrl, type IdolId } from "@/lib/ai-live/idols";

export function IdolGroupRoom({
  initial,
  channels,
  backdropUrl = null,
  vrmUrl = null,
  hostUsername,
}: {
  initial: IdolId;
  channels: Partial<Record<IdolId, string>>;
  backdropUrl?: string | null;
  vrmUrl?: string | null;
  hostUsername?: string | null;
}) {
  const idol = idolById(initial) ?? IDOLS[0];

  return (
    <MocoLiveRoom
      key={idol.id}
      channelId={channels[idol.id] ?? null}
      vrmUrl={vrmUrl || playableIdolVrmUrl(idol.vrmUrl) || idol.vrmUrl}
      backdropUrl={backdropUrl}
      hostUsername={hostUsername?.trim() || idol.username}
      showVrm
      hostNameKey={idol.nameKey}
      titleKey={idol.titleKey}
      subKey={idol.roleKey}
      memberId={idol.id}
      donationPoll={`/api/live/idol/${idol.id}/donations`}
      signInPath={`/live/${idol.id}`}
    />
  );
}
