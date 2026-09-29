import type { Metadata } from "next";
import { ContributionTowerView } from "@/components/contribution-tower/contribution-tower-view";
import { listContributionTowerBlocks } from "@/lib/contribution-tower/service";

export const metadata: Metadata = {
  title: "실시간 기여 탑 — MoCoMo",
  description:
    "MOCO 충전마다 쌓이는 MoCoMo 실시간 기여 탑. 결제 완료 즉시 프로필이 등록되는 패키지 서비스입니다.",
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
