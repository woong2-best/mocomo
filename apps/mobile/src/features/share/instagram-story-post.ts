import type { FeedMedia, FeedPost } from "@/api/feed";
import type { ReelItem } from "@/api/reels";
import { postUrl } from "@/lib/post-share";

export type InstagramStoryPost = {
  id: string;
  authorUsername: string;
  authorName?: string | null;
  authorImage?: string | null;
  title?: string | null;
  content?: string | null;
  mediaUri?: string | null;
  mediaIsVideo?: boolean;
  likeCount?: number;
  commentCount?: number;
  hideIdentity?: boolean;
};

function publicMediaUri(media?: FeedMedia | null, nsfw?: boolean): {
  uri: string | null;
  isVideo: boolean;
} {
  if (!media || media.locked || nsfw) return { uri: null, isVideo: false };
  const isVideo = media.type === "VIDEO";
  const uri = (isVideo ? media.posterUrl : media.url)?.trim() || media.url?.trim() || null;
  return { uri, isVideo };
}

export function storyPostFromFeedPost(
  post: FeedPost,
  opts?: { hideIdentity?: boolean }
): InstagramStoryPost {
  const media = post.media?.find((item) => item.type === "IMAGE" || item.type === "VIDEO") ?? null;
  const preview = publicMediaUri(media, post.isNsfw);
  return {
    id: post.id,
    authorUsername: post.author.username,
    authorName: post.author.name,
    authorImage: post.author.image,
    title: post.title,
    content: post.content,
    mediaUri: preview.uri,
    mediaIsVideo: preview.isVideo,
    likeCount: post._count?.likes,
    commentCount: post._count?.comments,
    hideIdentity: opts?.hideIdentity,
  };
}

export function storyPostFromReel(reel: ReelItem): InstagramStoryPost {
  const locked = !!reel.media.locked;
  const nsfw = reel.isNsfw;
  const isVideo = (reel.mediaType ?? "VIDEO") === "VIDEO";
  const uri =
    locked || nsfw
      ? null
      : (isVideo ? reel.media.posterUrl : reel.media.url)?.trim() || reel.media.url?.trim() || null;
  return {
    id: reel.postId,
    authorUsername: reel.author.username,
    authorName: reel.author.name,
    authorImage: reel.author.image,
    title: reel.title,
    content: reel.content,
    mediaUri: uri,
    mediaIsVideo: isVideo,
    likeCount: reel.likeCount,
    commentCount: reel.commentCount,
  };
}

export function storyPostUrl(postId: string): string {
  return postUrl(postId);
}
