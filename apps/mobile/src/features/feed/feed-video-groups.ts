import type { FeedMedia, FeedPost } from "@/api/feed";
import type { ReelItem } from "@/api/reels";

export type FeedVideoGroup = {
  postId: string;
  videos: ReelItem[];
};

export type FeedVideoOpenTarget = {
  postId: string;
  mediaId?: string | null;
  mediaIndex?: number;
};

function isPlayableVideo(m: FeedMedia): boolean {
  if (m.type !== "VIDEO") return false;
  if ((m.priceKrw ?? 0) > 0) return false;
  return Boolean(m.url?.trim());
}

function resolveHlsUrl(m: FeedMedia): string | null {
  const stored = m.hlsUrl?.trim() || null;
  if (stored && stored.includes(".m3u8")) return stored;
  if (m.url?.includes(".m3u8")) return m.url;
  return null;
}

function mediaKey(postId: string, video: FeedMedia): string {
  return video.id?.trim() || `${postId}:${video.url}`;
}

export function postVideoToReelItem(post: FeedPost, video: FeedMedia): ReelItem | null {
  if (!isPlayableVideo(video)) return null;
  const id = mediaKey(post.id, video);
  return {
    id: `${post.id}:${id}`,
    postId: post.id,
    title: post.title ?? null,
    content: post.content,
    createdAt: post.createdAt,
    isNsfw: post.isNsfw,
    viewCount: 0,
    author: {
      id: post.author.id,
      username: post.author.username,
      name: post.author.name ?? null,
      image: post.author.image,
    },
    media: {
      id,
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
    liked: !!post.liked,
    starred: false,
  };
}

/** Vertical = post groups; horizontal = videos inside a post. */
export function buildFeedVideoGroups(posts: FeedPost[]): FeedVideoGroup[] {
  const groups: FeedVideoGroup[] = [];
  for (const post of posts) {
    const videos: ReelItem[] = [];
    for (const m of post.media ?? []) {
      const reel = postVideoToReelItem(post, m);
      if (reel) videos.push(reel);
    }
    if (videos.length > 0) groups.push({ postId: post.id, videos });
  }
  return groups;
}

export function findGroupOpenPosition(
  groups: FeedVideoGroup[],
  target: FeedVideoOpenTarget
): { groupIndex: number; videoIndex: number } | null {
  const groupIndex = groups.findIndex((g) => g.postId === target.postId);
  if (groupIndex < 0) return null;
  const group = groups[groupIndex]!;
  if (target.mediaId) {
    const videoIndex = group.videos.findIndex(
      (r) =>
        r.media.id === target.mediaId ||
        r.media.id === `${target.postId}:${target.mediaId}`
    );
    if (videoIndex >= 0) return { groupIndex, videoIndex };
  }
  if (typeof target.mediaIndex === "number" && target.mediaIndex >= 0) {
    return {
      groupIndex,
      videoIndex: Math.min(target.mediaIndex, group.videos.length - 1),
    };
  }
  return { groupIndex, videoIndex: 0 };
}

export function firstVisualMedia(post: FeedPost): FeedMedia | null {
  const list = post.media ?? [];
  return list.find((m) => (m.type === "IMAGE" || m.type === "VIDEO") && m.url) ?? null;
}

export function postHasPlayableVideo(post: FeedPost): boolean {
  return (post.media ?? []).some(isPlayableVideo);
}
