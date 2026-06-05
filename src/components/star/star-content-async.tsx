import { getCachedSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StarFeedClient } from "@/components/star/star-feed-client";
import type { GridPost } from "@/components/feed/feed-post-card";
import { getStarredPostsForUser } from "@/lib/star-bookmarks";

export async function StarContentAsync() {
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/star");

  let posts: GridPost[] = [];
  try {
    posts = await getStarredPostsForUser(session.user.id);
  } catch {
    posts = [];
  }

  return <StarFeedClient initialPosts={posts} />;
}
