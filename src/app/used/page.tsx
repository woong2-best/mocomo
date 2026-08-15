import Link from "next/link";
import { Suspense } from "react";
import { Package } from "lucide-react";
import { getUsedListings, isUsedDbReady } from "@/actions/used-market";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DbSetupBanner } from "@/components/ui/db-setup-banner";
import { UsedListingGrid } from "@/components/used/used-listing-grid";
import { UsedSearchHeader } from "@/components/used/used-search-header";
import { UsedFeedSkeleton } from "@/components/used/used-loading-skeletons";
import { UsedWriteFab } from "@/components/used/used-write-fab";
import { Button } from "@/components/ui/button";
import { PageSection } from "@/components/layout/page-section";

async function UsedFeed({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    region?: string;
    sido?: string;
    mode?: string;
    work?: string;
    product?: string;
  }>;
}) {
  const { q, category, region, sido, mode, work, product } = await searchParams;

  const [dbReady, listings, session] = await Promise.all([
    isUsedDbReady(),
    getUsedListings({
      q,
      category,
      region,
      sido,
      work,
      product,
      status: "SELLING",
      liveAuctionOnly: mode === "auction",
    }),
    auth(),
  ]);

  const viewerPrefs = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: { showNsfw: true },
      })
    : null;
  const viewerShowNsfw = viewerPrefs?.showNsfw ?? false;

  if (!dbReady) {
    return <DbSetupBanner title="중고거래를 일시적으로 불러올 수 없습니다" />;
  }

  if (listings.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">
          {q || category || region || sido || work || product
            ? "선택한 조건에 맞는 상품이 없어요."
            : "아직 올라온 중고 글이 없어요."}
        </p>
        <Button variant="secondary" asChild>
          <Link href="/used/new" prefetch>
            첫 글 올리기
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <PageSection title="상품 목록" description={`${listings.length}개`}>
      <UsedListingGrid
        listings={listings}
        viewerUserId={session?.user?.id ?? null}
        viewerShowNsfw={viewerShowNsfw}
      />
    </PageSection>
  );
}

export default async function UsedHomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    region?: string;
    sido?: string;
    mode?: string;
    work?: string;
    product?: string;
  }>;
}) {
  return (
    <div className="space-y-4">
      <UsedSearchHeader />
      <Suspense fallback={<UsedFeedSkeleton />}>
        <UsedFeed searchParams={searchParams} />
      </Suspense>
      <UsedWriteFab />
    </div>
  );
}
