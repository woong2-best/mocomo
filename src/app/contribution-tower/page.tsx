import type { Metadata } from "next";
import { ContributionTowerView } from "@/components/contribution-tower/contribution-tower-view";
import { listContributionTowerBlocks } from "@/lib/contribution-tower/service";

export const metadata: Metadata = {
  title: "Live contribution tower — MoCoMo",
  description:
    "MoCoMo live contribution tower — one block per MOCO top-up. Profiles register instantly after payment.",
};

export const dynamic = "force-dynamic";

export default async function ContributionTowerPage() {
  const initial = await listContributionTowerBlocks({ limit: 120 });
  return (
    <main className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-[#F5F0E6] via-background to-background dark:from-[#060d18] dark:via-[#0a1628] dark:to-[#0a1628]">
      <ContributionTowerView initial={initial} />
    </main>
  );
}
