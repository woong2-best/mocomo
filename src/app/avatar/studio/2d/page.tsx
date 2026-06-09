import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { Avatar2dStudio } from "@/components/avatar/avatar-2d-studio";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: "2D 아바타 편집 | MoCoMo",
  description: "캔버스·사진 기반 2D 버츄얼 아바타 편집",
};

export default async function Avatar2dStudioPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/avatar/studio/2d");

  return <Avatar2dStudio />;
}
