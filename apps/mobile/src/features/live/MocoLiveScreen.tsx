import { AiLiveRoom } from "@/features/live/ai/AiLiveRoom";
import { ZELIE_LIVE_POSTER } from "@/features/live/ai/idol-lives";
import { useI18n } from "@/i18n/I18nProvider";
/** Same row as the website room. Server keeps this channel live. */
const MOCO_CHANNEL_ID = "moco-official";

export function MocoLiveScreen() {
  const { t } = useI18n();

  return (
    <AiLiveRoom
      channelId={MOCO_CHANNEL_ID}
      poster={ZELIE_LIVE_POSTER}
      title={t("m.live.ai_card_title")}
      host={t("m.live.ai_host_name")}
      role={t("m.live.ai_card_sub")}
    />
  );
}
