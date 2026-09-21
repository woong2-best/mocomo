import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { getLiveStudioSettings } from "@/actions/live-studio";
import { LiveStudioPanel } from "@/components/live/live-studio-panel";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: "라이브 스튜디오 | MoCoMo",
  description: "채팅 공지 · 카테고리 · 스태프 · 시청자 차단",
};

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
