import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { isCommunityDbReady } from "@/actions/community-hub";
import { CommunityCreateForm } from "@/components/communities/community-create-form";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { DbSetupBanner } from "@/components/ui/db-setup-banner";

/** Server action createCommunity — allow headroom if provision races onto this route. */
export const maxDuration = 60;

export default async function NewCommunityPage() {
  const user = await getCachedCurrentUser();
  if (!user) {
    redirect("/auth/signin?callbackUrl=/communities/new");
  }

  const dbReady = await isCommunityDbReady();

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      {!dbReady && (
        <DbSetupBanner title="커뮤니티 DB가 준비되지 않았습니다. Supabase SQL 섹션 N을 실행해 주세요." />
      )}
      <CommunityCreateForm embedded />
    </AppPageChrome>
  );
}
