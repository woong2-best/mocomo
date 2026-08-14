import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StarHubClient } from "@/components/star/star-hub-client";
import { getStarHubForUser } from "@/lib/star-bookmarks";

export async function StarContentAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/star");

  let hub = { posts: [], creators: [], total: 0 };
  try {
    hub = await getStarHubForUser(session.user.id);
  } catch {
    hub = { posts: [], creators: [], total: 0 };
  }

  return (
    <StarHubClient
      initialPosts={hub.posts}
      initialCreators={hub.creators}
      initialTotal={hub.total}
    />
  );
}
