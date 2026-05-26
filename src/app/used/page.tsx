import Link from "next/link";
import { Suspense } from "react";
import { Package } from "lucide-react";
import { getUsedListings, isUsedDbReady } from "@/actions/used-market";
import { DbSetupBanner } from "@/components/ui/db-setup-banner";
import { UsedListingCard } from "@/components/used/used-listing-card";
import { UsedSearchHeader } from "@/components/used/used-search-header";
import { Button } from "@/components/ui/button";

async function UsedFeed({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; region?: string; sido?: string }>;
}) {
  const { q, category, region, sido } = await searchParams;
  const listings = await getUsedListings({ q, category, region, sido, status: "SELLING" });

  if (listings.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">
          {q || category || region || sido ? "검색 결과가 없어요." : "아직 올라온 중고 글이 없어요."}
        </p>
        <Button variant="secondary" asChild>
          <Link href="/used/new">첫 글 올리기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-8">
      {listings.map((l) => (
        <UsedListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}

export default async function UsedHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; region?: string; sido?: string }>;
}) {
  const dbReady = await isUsedDbReady();

  return (
    <div>
      {!dbReady && (
        <DbSetupBanner title="중고거래를 일시적으로 불러올 수 없습니다" />
      )}
      <UsedSearchHeader />
      <Suspense
        fallback={<div className="grid grid-cols-2 gap-3 py-8">{[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />)}</div>}
      >
        <UsedFeed searchParams={searchParams} />
      </Suspense>
      <Button
        asChild
        variant="secondary"
        size="icon"
        className="fixed bottom-24 right-4 lg:right-[calc(50%-28rem)] z-50 h-14 w-14 rounded-full shadow-lg text-2xl font-light"
        aria-label="글쓰기"
      >
        <Link href="/used/new">+</Link>
      </Button>
    </div>
  );
}
