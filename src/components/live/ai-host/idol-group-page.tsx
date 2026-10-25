import { IdolGroupRoom } from "@/components/live/ai-host/idol-group-room";
import { LiveFeatureDisabledNotice } from "@/components/live/live-feature-disabled";
import { getAvatarPublicProfiles } from "@/lib/ai-live/avatar-profiles";
import { getIdolBackdropUrl } from "@/lib/ai-live/idol-backdrop";
import { getIdolVrmUrl } from "@/lib/ai-live/idol-vrm";
import { ensureIdolChannels } from "@/lib/ai-live/official-channel";
import { idolById, type IdolId } from "@/lib/ai-live/idols";
import { getServerTranslator } from "@/lib/i18n/server";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export async function idolGroupMetadata(member: IdolId) {
  const idol = idolById(member);
  const { t } = await getServerTranslator();
  return {
    title: `${idol ? t(idol.nameKey) : "Live"} | MoCoMo`,
    description: idol ? t(idol.roleKey) : "",
  };
}

export async function renderIdolGroup(member: IdolId) {
  if (!isLiveFeatureEnabled()) return <LiveFeatureDisabledNotice />;
  const [channels, backdropUrl, vrmUrl, profiles] = await Promise.all([
    ensureIdolChannels().catch(() => ({})),
    getIdolBackdropUrl(member).catch(() => null),
    getIdolVrmUrl(member).catch(() => null),
    getAvatarPublicProfiles().catch(() => null),
  ]);
  return (
    <IdolGroupRoom
      key={member}
      initial={member}
      channels={channels}
      backdropUrl={backdropUrl}
      vrmUrl={vrmUrl}
      hostUsername={profiles?.[member]?.username}
    />
  );
}
