import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { isCommunityDbReady } from "@/actions/community-hub";
import { CommunityCreateForm } from "@/components/communities/community-create-form";
import { DbSetupBanner } from "@/components/ui/db-setup-banner";

export default async function NewCommunityPage() {
  const user = await getCachedCurrentUser();
  if (!user) {
    redirect("/auth/signin?callbackUrl=/communities/new");
  }

  const dbReady = await isCommunityDbReady();

  return (
    <div>
      {!dbReady && (
        <div className="max-w-lg mx-auto px-4 pt-4">
          <DbSetupBanner title="커뮤니티 DB가 준비되지 않았습니다. Supabase SQL 섹션 N을 실행해 주세요." />
        </div>
      )}
      <CommunityCreateForm />
    </div>
  );
}
