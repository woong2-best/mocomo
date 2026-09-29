import { redirect } from "next/navigation";
import Link from "next/link";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedMyHub } from "@/components/used/used-my-hub";
import type { UsedHubLane } from "@/actions/used-market";
import { ChevronLeft } from "lucide-react";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { MARKET_BRAND_NAME } from "@/lib/market-brand";

export default async function UsedMyPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string }>;
}) {
  const user = await getCachedCurrentUser();
  if (!user?.id) redirect("/auth/signin?callbackUrl=/market/my");

  const { lane } = await searchParams;

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/market"
        prefetch
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ChevronLeft className="h-4 w-4" />
        {MARKET_BRAND_NAME}
      </Link>
      <UsedMyHub
        userId={user.id}
        initialLane={
          lane === "purchased" || lane === "selling" || lane === "favorites" || lane === "disputes"
            ? (lane as UsedHubLane)
            : undefined
        }
      />
    </AppPageChrome>
  );
}
