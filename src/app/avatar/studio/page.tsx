import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { LiveStudioHub } from "@/components/avatar/live-studio-hub";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: "스튜디오 | MoCoMo",
  description: "방송 스튜디오 · 2D 아바타 · 3D VRM 아바타 스튜디오",
};

export default async function AvatarStudioHubPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/avatar/studio");

  return <LiveStudioHub />;
}
