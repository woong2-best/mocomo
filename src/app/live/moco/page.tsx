import { MocoLiveRoom } from "@/components/live/ai-host/moco-live-room";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { LiveFeatureDisabledNotice } from "@/components/live/live-feature-disabled";
import { getServerTranslator } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerTranslator();
  return {
    title: `${t("live.aiHostName")} | MoCoMo`,
    description: t("live.aiCardSub"),
  };
}

export default function MocoLivePage() {
  if (!isLiveFeatureEnabled()) return <LiveFeatureDisabledNotice />;
  return <MocoLiveRoom />;
}
