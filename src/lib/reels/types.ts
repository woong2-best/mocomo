export type ReelAuthor = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export type ReelMediaKind = "IMAGE" | "VIDEO";

export type ReelMedia = {
  id: string;
  /** Progressive MP4/WebM CDN URL, or a still image URL. */
  url: string;
  /**
   * Optional HLS/DASH manifest for ABR.
   * When present (or when `url` is `.m3u8`), the player uses hls.js / native HLS.
   */
  hlsUrl: string | null;
  /** Optional poster / thumbnail. */
  posterUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  priceKrw: number;
};

export type ReelItem = {
  id: string;
  postId: string;
  title: string | null;
  content: string;
  createdAt: string;
  isNsfw: boolean;
  viewCount: number;
  author: ReelAuthor;
  mediaType?: ReelMediaKind;
  media: ReelMedia;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  starred: boolean;
  /** QnA clip — stays out of the home reels actions. */
  qna?: boolean;
};

export type ReelsPageResponse = {
  items: ReelItem[];
  nextCursor: string | null;
  error?: string;
};

export function isReelStill(reel: Pick<ReelItem, "mediaType">): boolean {
  return reel.mediaType === "IMAGE";
}
