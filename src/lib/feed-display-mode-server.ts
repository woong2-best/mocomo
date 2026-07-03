import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  FEED_DISPLAY_MODE_COOKIE,
  DEFAULT_FEED_DISPLAY_MODE,
  isFeedDisplayMode,
  type FeedDisplayMode,
} from "@/lib/feed-display-mode";

export async function getRequestFeedDisplayMode(): Promise<FeedDisplayMode> {
  const session = await auth();
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { feedDisplayMode: true },
    });
    if (user?.feedDisplayMode) return user.feedDisplayMode;
  }

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(FEED_DISPLAY_MODE_COOKIE)?.value;
  if (fromCookie && isFeedDisplayMode(fromCookie)) return fromCookie;

  return DEFAULT_FEED_DISPLAY_MODE;
}
