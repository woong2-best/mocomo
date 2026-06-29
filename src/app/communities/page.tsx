import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CommunitiesGridAsync } from "@/components/communities/communities-grid-async";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { GridCardsSkeleton } from "@/components/ui/content-skeletons";

export const revalidate = 120;

export default function CommunitiesPage() {
  return (
    <AppPageChrome maxWidth="4xl">
      <div className="flex items-center justify-between">
        <NativePageTitle>
          <h1 className="text-2xl font-bold">커뮤니티</h1>
        </NativePageTitle>
        <Link href="/communities/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            커뮤니티 만들기
          </Button>
        </Link>
      </div>

      <Suspense fallback={<GridCardsSkeleton count={4} />}>
        <CommunitiesGridAsync />
      </Suspense>
    </AppPageChrome>
  );
}
