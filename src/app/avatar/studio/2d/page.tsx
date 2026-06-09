import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { Avatar2dStudio } from "@/components/avatar/avatar-2d-studio";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const metadata = {
  title: "2D 아바타 편집 | MoCoMo",
  description: "사이트에서 그리거나 PNG 업로드 → 투명 PNG로 라이브·OBS 방송",
};

export default async function Avatar2dStudioPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/avatar/studio/2d");

  return <Avatar2dStudio />;
}
