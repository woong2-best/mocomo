import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AiLiveRoom } from "@/features/live/ai/AiLiveRoom";
import { idolByMember } from "@/features/live/ai/idol-lives";
import { useI18n } from "@/i18n/I18nProvider";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "IdolLive">;

export function IdolLiveScreen({ route }: Props) {
  const { t } = useI18n();
  const member = route.params.member;
  const idol = idolByMember(member);

  return (
    <AiLiveRoom
      channelId={idol.channelId}
      poster={idol.poster}
      title={t(idol.titleKey)}
      host={t(idol.nameKey)}
      role={t(idol.roleKey)}
      characterId={idol.id}
    />
  );
}
