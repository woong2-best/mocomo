import type { Metadata } from "next";
import { ContributionTowerView } from "@/components/contribution-tower/contribution-tower-view";
import { listContributionTowerBlocks } from "@/lib/contribution-tower/service";
import { getServerTranslator } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();
  return {
    title: t("tower.metaTitle"),
    description: t("tower.metaDesc"),
  };
}

export const dynamic = "force-dynamic";

export default async function ContributionTowerPage() {
  const initial = await listContributionTowerBlocks({ limit: 200 });
  return (
    <main className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-[#F5F0E6] via-background to-background dark:from-[#060d18] dark:via-[#0a1628] dark:to-[#0a1628]">
      <ContributionTowerView initial={initial} />
    </main>
  );
}
