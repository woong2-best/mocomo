import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { VirtualAvatarStudio } from "@/components/avatar/virtual-avatar-studio";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: "버츄얼 아바타 스튜디오 | MoCoMo",
  description: "신체·얼굴·의상·헤어·효과를 실시간으로 커스터마이즈하는 버츄얼 아바타 스튜디오",
};

export default async function AvatarStudioPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/avatar/studio");

  return <VirtualAvatarStudio />;
}
