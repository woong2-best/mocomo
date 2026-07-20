export const FLASH_POST_STORAGE_KEY = "mocomo:flash-post";

export type PublishedToastKind = "publishing" | "published" | "error" | "info";

export type PublishedToastInput = {
  kind?: PublishedToastKind;
  message: string;
  detail?: string;
  postId?: string;
  href?: string;
  userImage?: string | null;
  userName?: string | null;
  durationMs?: number;
  /** 게시 성공 pill에서 ⋯ 메뉴 표시 */
  showActions?: boolean;
};
