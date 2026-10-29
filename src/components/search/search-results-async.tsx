import { getAuthUserId } from "@/lib/auth";
import { resolveCanViewNsfw } from "@/lib/nsfw-viewer-access";
import { recordSearchEvent } from "@/lib/search/record";
import { getRelatedSearchQueries } from "@/lib/search/suggest";
import { enrichSearchPageUsers, getCachedSearchPage } from "@/lib/search-page";
import type { SearchPageFilter } from "@/lib/search-page-shared";
import { attachWebPaidMediaPlayback } from "@/lib/paid-media-playback";
import { isPaymentsConfigured } from "@/lib/payments";
import { SearchPageFeed } from "@/components/search/search-page-feed";

export async function SearchResultsAsync({
  query,
  scope = "global",
  filter = "top",
}: {
  query: string;
  scope?: "global" | "social";
  filter?: SearchPageFilter;
}) {
  const q = query.trim();
  if (q.length < 1) return null;

  const viewerId = await getAuthUserId();
  const canViewNsfw = await resolveCanViewNsfw(viewerId);
  const cached = await getCachedSearchPage(q, canViewNsfw);
  const users = await enrichSearchPageUsers(viewerId, cached.users);
  const animes = scope === "social" ? [] : cached.animes;
  const [postsTop, postsLatest] = await Promise.all([
    attachWebPaidMediaPlayback(cached.postsTop, viewerId),
    attachWebPaidMediaPlayback(cached.postsLatest, viewerId),
  ]);

  const resultCount = users.length + animes.length + postsLatest.length;
  void recordSearchEvent({
    rawQuery: q,
    resultCount,
    userId: viewerId,
  }).catch(() => undefined);

  const related = await getRelatedSearchQueries(q, 8).catch(() => []);

  return (
    <SearchPageFeed
      query={q}
      scope={scope}
      initialFilter={filter}
      users={users}
      postsTop={postsTop}
      postsLatest={postsLatest}
      animes={animes}
      related={related}
      viewerId={viewerId}
      paymentsEnabled={isPaymentsConfigured()}
    />
  );
}
