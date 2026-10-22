import { MocoLiveRoom } from "@/components/live/ai-host/moco-live-room";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { LiveFeatureDisabledNotice } from "@/components/live/live-feature-disabled";
import { getServerTranslator } from "@/lib/i18n/server";
import { ensureMocoOfficialChannel } from "@/lib/ai-live/official-channel";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerTranslator();
  return {
    title: `${t("live.aiHostName")} | MoCoMo`,
    description: t("live.aiCardSub"),
  };
}

export default async function MocoLivePage() {
  if (!isLiveFeatureEnabled()) return <LiveFeatureDisabledNotice />;
  const channel = await ensureMocoOfficialChannel().catch(() => null);
  return <MocoLiveRoom channelId={channel?.channelId ?? null} backdropUrl="/live/backgrounds/moco-room.jpg" />;
}
