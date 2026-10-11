export const FEED_LIVE_RELOAD_EVENT = "mocomo:feed-live-reload";

export type FeedLiveReloadDetail = {
  reason: "published" | "manual";
  postId?: string;
  communityId?: string | null;
};

export function notifyFeedLiveReload(detail: FeedLiveReloadDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<FeedLiveReloadDetail>(FEED_LIVE_RELOAD_EVENT, {
      detail,
    })
  );
}

export function notifyPostPublished(
  postId: string,
  extra?: { communityId?: string | null }
) {
  notifyFeedLiveReload({
    reason: "published",
    postId,
    communityId: extra?.communityId,
  });
}

export function subscribeFeedLiveReload(
  listener: (detail: FeedLiveReloadDetail) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<FeedLiveReloadDetail>).detail;
    if (!detail) return;
    listener(detail);
  };
  window.addEventListener(FEED_LIVE_RELOAD_EVENT, handler);
  return () => window.removeEventListener(FEED_LIVE_RELOAD_EVENT, handler);
}
