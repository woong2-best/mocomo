import { idolById, type IdolId } from "@/lib/ai-live/idols";
import { getServerTranslator } from "@/lib/i18n/server";

export async function idolGroupMetadata(member: IdolId) {
  const idol = idolById(member);
  const { t } = await getServerTranslator();
  return {
    title: `${idol ? t(idol.nameKey) : "Live"} | MoCoMo`,
    description: idol ? t(idol.roleKey) : "",
  };
}
