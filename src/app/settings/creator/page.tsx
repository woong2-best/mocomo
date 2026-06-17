import { redirect } from "next/navigation";
import Link from "next/link";
import { getCachedSession } from "@/lib/auth";
import { CreatorMonetizationSettings } from "@/components/monetization/creator-monetization-settings";
import { Button } from "@/components/ui/button";

export default async function CreatorSettingsPage() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settings/creator");

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">크리에이터 수익</h1>
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            설정
          </Button>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        구독·유료 게시물·즉시 구매·등급 혜택을 설정합니다. MOCO 충전/잔액은 초기 버전에 없으며, 결제는
        Stripe로 처리됩니다.
      </p>
      <CreatorMonetizationSettings />
    </div>
  );
}
