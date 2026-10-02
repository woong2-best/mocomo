import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { getLiveStudioSettings } from "@/actions/live-studio";
import { LiveStudioPanel } from "@/components/live/live-studio-panel";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { getServerTranslator } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerTranslator();
  return {
    title: `${t("live.studio.title")} | MoCoMo`,
    description: t("live.studio.metaDescription"),
  };
}

export default async function LiveStudioPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/live/studio");

  const initial = await getLiveStudioSettings().catch(() => ({
    bio: "",
    announcement: "",
    scheduleNote: "",
    scheduleWeekdays: [] as number[],
    scheduleTime: "",
    defaultTitle: "",
    defaultCategory: "JUST_CHATTING" as const,
  }));

  return <LiveStudioPanel initial={initial} />;
}
