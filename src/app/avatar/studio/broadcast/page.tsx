import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { getStreamerProfile } from "@/actions/streamer";
import { BroadcastStudioPanel } from "@/components/avatar/broadcast-studio-panel";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: "방송 스튜디오 | MoCoMo",
  description: "유튜브·트witch 스타일 방송 설정, OBS·스트리머 프로필",
};

export default async function BroadcastStudioPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/avatar/studio/broadcast");

  const profile = await getStreamerProfile().catch(() => null);

  return (
    <BroadcastStudioPanel
      initial={{
        bio: profile?.bio ?? "",
        announcement: profile?.announcement ?? "",
        scheduleNote: profile?.scheduleNote ?? "",
      }}
    />
  );
}
