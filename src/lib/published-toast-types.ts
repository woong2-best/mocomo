export const FLASH_POST_STORAGE_KEY = "mocomo:flash-post";
export const SCROLL_FEED_TOP_KEY = "mocomo:scroll-feed-top";

export type PublishedToastKind = "publishing" | "published" | "error" | "info" | "warning";

export type ToastAvatar = {
  image?: string | null;
  name?: string | null;
};

export type PublishedToastInput = {
  kind?: PublishedToastKind;
  message: string;
  detail?: string;
  postId?: string;
  /** 클릭 시 이동. 없으면 피드 맨 위로 */
  href?: string;
  userImage?: string | null;
  userName?: string | null;
  /** 공동 작성자 등 — X처럼 겹친 아바타 */
  avatars?: ToastAvatar[];
  durationMs?: number;
  showActions?: boolean;
};
