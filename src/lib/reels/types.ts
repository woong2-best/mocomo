export type ReelAuthor = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
};

export type ReelMedia = {
  id: string;
  /** Progressive MP4/WebM CDN URL (required). */
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
  media: ReelMedia;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  starred: boolean;
};

export type ReelsPageResponse = {
  items: ReelItem[];
  nextCursor: string | null;
  error?: string;
};
