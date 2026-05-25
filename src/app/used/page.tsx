import Link from "next/link";
import { Suspense } from "react";
import { getUsedListings } from "@/actions/used-market";
import { UsedListingCard } from "@/components/used/used-listing-card";
import { UsedSearchHeader } from "@/components/used/used-search-header";

async function UsedFeed({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; region?: string }>;
}) {
  const { q, category, region } = await searchParams;
  const listings = await getUsedListings({ q, category, region, status: "SELLING" });

  if (listings.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-5xl">🥕</p>
        <p className="text-muted-foreground text-sm">
          {q || category || region ? "검색 결과가 없어요." : "아직 올라온 중고 글이 없어요."}
        </p>
        <Link
          href="/used/new"
          className="inline-flex h-11 px-6 items-center rounded-xl bg-[#FF6F0F] text-white font-semibold"
        >
          첫 글 올리기
        </Link>
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

export default function UsedHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; region?: string }>;
}) {
  return (
    <div className="pt-2">
      <UsedSearchHeader />
      <Suspense
        fallback={<div className="grid grid-cols-2 gap-3 py-8">{[1, 2, 3, 4].map((i) => <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />)}</div>}
      >
        <UsedFeed searchParams={searchParams} />
      </Suspense>
      <Link
        href="/used/new"
        className="fixed bottom-20 right-4 lg:right-[calc(50%-28rem)] z-50 h-14 w-14 rounded-full bg-[#FF6F0F] text-white shadow-lg flex items-center justify-center text-2xl font-light hover:scale-105 transition-transform"
        aria-label="글쓰기"
      >
        +
      </Link>
    </div>
  );
}
