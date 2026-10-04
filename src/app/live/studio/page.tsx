import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { getLiveStudioSettings } from "@/actions/live-studio";
import { LiveStudioPanel } from "@/components/live/live-studio-panel";
import { isLiveFeatureEnabled } from "@/lib/live-feature";
import { getServerTranslator } from "@/lib/i18n/server";
import { mintStudioObsChatForUser } from "@/lib/live-external/studio-obs-url";
import { publicSiteUrl } from "@/lib/site-url";

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

  const minted = await mintStudioObsChatForUser(session.user.id);
  const overlayUrls =
    "chatUrl" in minted && minted.chatUrl
      ? {
          chat: publicSiteUrl(minted.chatUrl),
          video: minted.mocoWidgetUrl ? publicSiteUrl(minted.mocoWidgetUrl) : "",
          chatTip: minted.donationUrl ? publicSiteUrl(minted.donationUrl) : "",
        }
      : null;

  return <LiveStudioPanel initial={initial} overlayUrls={overlayUrls} />;
}
