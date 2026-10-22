"use client";

import { useState } from "react";
import { MocoLiveRoom } from "@/components/live/ai-host/moco-live-room";
import { useLocale } from "@/components/providers/locale-provider";
import { IDOLS, IDOL_VRM_FALLBACK, idolById, playableIdolVrmUrl, type IdolId } from "@/lib/ai-live/idols";

function rememberIdolPath(id: IdolId) {
  const next = `/live/${id}`;
  if (window.location.pathname === next) return;
  History.prototype.replaceState.call(window.history, window.history.state, "", next);
}

export function IdolGroupRoom({
  initial,
  channels,
}: {
  initial: IdolId;
  channels: Partial<Record<IdolId, string>>;
}) {
  const { t } = useLocale();
  const [member, setMember] = useState(initial);
  const idol = idolById(member) ?? IDOLS[0];
  const ownVrm = playableIdolVrmUrl(idol.vrmUrl);
  const hasOwnVrm = ownVrm !== IDOL_VRM_FALLBACK;

  const select = (id: IdolId) => {
    setMember(id);
    rememberIdolPath(id);
  };

  return (
    <MocoLiveRoom
      channelId={channels[idol.id] ?? null}
      vrmUrl={hasOwnVrm ? ownVrm : undefined}
      hostUsername={idol.username}
      posterSrc={idol.poster}
      showVrm={hasOwnVrm}
      hostNameKey={idol.nameKey}
      titleKey={idol.titleKey}
      subKey={idol.roleKey}
      memberId={idol.id}
      donationPoll={`/api/live/idol/${idol.id}/donations`}
      signInPath={`/live/${idol.id}`}
      tabs={IDOLS.map((item) => ({
        id: item.id,
        label: t(item.nameKey),
        active: item.id === idol.id,
        onSelect: () => select(item.id),
      }))}
    />
  );
}
