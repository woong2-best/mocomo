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
    <main className="bg-[#0b1120]">
      <ContributionTowerView initial={initial} />
    </main>
  );
}
