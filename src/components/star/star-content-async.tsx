import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StarHubClient } from "@/components/star/star-hub-client";
import { getStarHubForUser, type StarHubResult } from "@/lib/star-bookmarks";

export async function StarContentAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/star");

  const emptyHub: StarHubResult = { posts: [], creators: [], total: 0 };
  let hub: StarHubResult = emptyHub;
  try {
    hub = await getStarHubForUser(session.user.id);
  } catch {
    hub = emptyHub;
  }

  return (
    <StarHubClient
      initialPosts={hub.posts}
      initialCreators={hub.creators}
      initialTotal={hub.total}
    />
  );
}
