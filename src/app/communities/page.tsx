import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CommunitiesHubAsync } from "@/components/communities/communities-hub-async";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { CommunitiesHubSkeleton } from "@/components/ui/content-skeletons";
import { RecentCommunitiesBar } from "@/components/communities/recent-communities-bar";

export const revalidate = 60;

export default function CommunitiesPage() {
  return (
    <AppPageChrome maxWidth="5xl">
      <div className="flex items-center justify-between gap-3">
        <NativePageTitle>
          <h1 className="text-2xl font-bold tracking-tight">커뮤니티</h1>
        </NativePageTitle>
        <Link href="/communities/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            커뮤니티 만들기
          </Button>
        </Link>
      </div>

      <RecentCommunitiesBar />

      <Suspense fallback={<CommunitiesHubSkeleton />}>
        <CommunitiesHubAsync />
      </Suspense>
    </AppPageChrome>
  );
}
