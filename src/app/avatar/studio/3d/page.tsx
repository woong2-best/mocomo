import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { VirtualAvatarStudio } from "@/components/avatar/virtual-avatar-studio";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: "3D 아바타 스튜디오 | MoCoMo",
  description: "VRM 체형·얼굴·의상·헤어·효과를 실시간으로 커스터마이즈하는 3D 버츄얼 아바타 스튜디오",
};

export default async function Avatar3dStudioPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/avatar/studio/3d");

  return <VirtualAvatarStudio />;
}
