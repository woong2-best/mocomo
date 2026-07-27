import type { GridPost } from "@/components/feed/feed-post-card";
import type { FeedLayoutItem } from "@/components/feed/feed-dual-column-layout";
import type { ReelItem } from "@/lib/reels/types";
import { isHlsUrl } from "@/lib/reels/playback-url";

export const FEED_VIDEO_VIEWER_HISTORY_KEY = "mocomoFeedVideoViewer";

export type FeedVideoOpenTarget = {
  postId: string;
  /** Preferred when the tapped tile has a media id. */
  mediaId?: string | null;
  /** Fallback index within the post's media array. */
  mediaIndex?: number;
};

type FeedMedia = NonNullable<GridPost["media"]>[number];

function isPlayableFeedVideo(m: FeedMedia): boolean {
  if (m.type !== "VIDEO") return false;
  if (m.locked) return false;
  if (!m.url?.trim()) return false;
  return true;
}

function resolveHlsUrl(m: FeedMedia): string | null {
  const stored = m.hlsUrl?.trim() || null;
  if (stored && isHlsUrl(stored)) return stored;
  if (isHlsUrl(m.url)) return m.url;
  return null;
}

function mediaKey(postId: string, video: FeedMedia): string {
  return video.id?.trim() || `${postId}:${video.url}`;
}

export function postVideoToReelItem(
  post: GridPost & { createdAt: string | Date },
  video: FeedMedia,
  liked: boolean,
  starred: boolean
): ReelItem | null {
  if (!isPlayableFeedVideo(video)) return null;

  const mediaId = mediaKey(post.id, video);

  return {
    id: `${post.id}:${mediaId}`,
    postId: post.id,
    title: post.title ?? null,
    content: post.content,
    createdAt:
      typeof post.createdAt === "string"
        ? post.createdAt
        : post.createdAt.toISOString(),
    isNsfw: post.isNsfw,
    viewCount: post.viewCount ?? 0,
    author: {
      id: post.author.id,
      username: post.author.username,
      name: post.author.name ?? null,
      image: post.author.image,
    },
    media: {
      id: mediaId,
      url: video.url,
      hlsUrl: resolveHlsUrl(video),
      posterUrl: video.posterUrl?.trim() || null,
      width: video.width ?? null,
      height: video.height ?? null,
      duration: video.duration ?? null,
      priceKrw: video.priceKrw ?? 0,
    },
    likeCount: post._count?.likes ?? 0,
    commentCount: post._count?.comments ?? 0,
    liked,
    starred,
  };
}

/** Flatten unlocked feed videos in timeline order for the immersive viewer. */
export function buildFeedVideoPlaylist(
  items: FeedLayoutItem[],
  likedIds: Set<string>,
  starredIds: Set<string>
): ReelItem[] {
  const playlist: ReelItem[] = [];
  for (const item of items) {
    if (item.type !== "post") continue;
    const post = item.data;
    const media = post.media ?? [];
    for (const m of media) {
      const reel = postVideoToReelItem(
        post,
        m,
        likedIds.has(post.id),
        starredIds.has(post.id)
      );
      if (reel) playlist.push(reel);
    }
  }
  return playlist;
}

export function findPlaylistIndex(
  playlist: ReelItem[],
  target: FeedVideoOpenTarget
): number {
  if (target.mediaId) {
    const byMedia = playlist.findIndex(
      (r) =>
        r.postId === target.postId &&
        (r.media.id === target.mediaId ||
          r.media.id === `${target.postId}:${target.mediaId}`)
    );
    if (byMedia >= 0) return byMedia;
  }
  return playlist.findIndex((r) => r.postId === target.postId);
}

export function getMainScrollEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("mocomo-main-scroll");
}

export function lockMainScroll(): () => void {
  const main = getMainScrollEl();
  const prevMain = main?.style.overflow ?? "";
  const prevBody = document.body.style.overflow;
  if (main) main.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  return () => {
    if (main) main.style.overflow = prevMain;
    document.body.style.overflow = prevBody;
  };
}
