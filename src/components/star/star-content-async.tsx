import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StarHubClient } from "@/components/star/star-hub-client";
import {
  getStarHubForUser,
  listStarredMarketListings,
  listStarredWikiEntries,
  type StarHubResult,
} from "@/lib/star-bookmarks";

export async function StarContentAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/star");

  const emptyHub: StarHubResult = { posts: [], creators: [], total: 0 };
  let hub: StarHubResult = emptyHub;
  let listings: Awaited<ReturnType<typeof listStarredMarketListings>> = [];
  let wiki: Awaited<ReturnType<typeof listStarredWikiEntries>> = [];
  try {
    [hub, listings, wiki] = await Promise.all([
      getStarHubForUser(session.user.id),
      listStarredMarketListings(session.user.id),
      listStarredWikiEntries(session.user.id),
    ]);
  } catch {
    hub = emptyHub;
  }

  return (
    <StarHubClient
      initialPosts={hub.posts}
      initialListings={listings}
      initialWiki={wiki}
      initialCreators={hub.creators}
      initialTotal={hub.total + listings.length + wiki.length}
    />
  );
}
