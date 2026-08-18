import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSupportDashboard, getSupportRankingWithAvatars } from "@/actions/support";
import { PlatformSupportCard } from "@/components/support/platform-support-card";
import { SupportRankingPodium } from "@/components/support/support-ranking-podium";
import { SupportTrophyIcon } from "@/components/icons/support-trophy-icon";
import { SupportPageChrome, SupportPageTitle } from "@/components/support/support-page-chrome";

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/support");

  const [dashboard, rankingEntries] = await Promise.all([
    getSupportDashboard(),
    getSupportRankingWithAvatars(20),
  ]);
  if (!dashboard) {
    redirect("/auth/signin");
  }

  return (
    <SupportPageChrome>
      <SupportPageTitle>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-folk-cobalt/15 bg-folk-cream text-folk-cobalt">
              <SupportTrophyIcon className="h-5 w-5" />
            </span>
            후원
          </h1>
          <p className="text-sm text-muted-foreground mt-1">크리에이터 편지 후원 · 광석 등급</p>
        </div>
      </SupportPageTitle>

      <SupportRankingPodium entries={rankingEntries} />

      {dashboard.platform ? (
        <PlatformSupportCard
          sentTotal={dashboard.platform.sentTotal}
          sentTier={dashboard.platform.sentTier}
        />
      ) : null}
    </SupportPageChrome>
  );
}
