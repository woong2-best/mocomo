"use client";

import { MocoLiveRoom } from "@/components/live/ai-host/moco-live-room";
import { IDOLS, idolById, playableIdolVrmUrl, type IdolId } from "@/lib/ai-live/idols";

export function IdolGroupRoom({
  initial,
  channels,
}: {
  initial: IdolId;
  channels: Partial<Record<IdolId, string>>;
}) {
  const idol = idolById(initial) ?? IDOLS[0];

  return (
    <MocoLiveRoom
      key={idol.id}
      channelId={channels[idol.id] ?? null}
      vrmUrl={playableIdolVrmUrl(idol.vrmUrl)}
      hostUsername={idol.username}
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
