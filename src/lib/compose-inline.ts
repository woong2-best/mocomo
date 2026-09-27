import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

export const FEED_INLINE_COMPOSE_ID = "feed-inline-compose";

export type FeedInlineComposeOpts = {
  communityId?: string;
  initialContent?: string;
  initialTitle?: string;
  viaMailbox?: boolean;
};

/** 홈 피드 상단 인라인 작성 — 전체 화면 글쓰기 시트 대신 사용 */
export function shouldUseFeedInlineCompose(
  pathname: string,
  opts?: FeedInlineComposeOpts
): boolean {
  if (opts?.viaMailbox || opts?.communityId) return false;
  const normalized =
    pathname === DEFAULT_LANDING_PATH
      ? DEFAULT_LANDING_PATH
      : pathname.replace(/\/$/, "") || DEFAULT_LANDING_PATH;
  return normalized === DEFAULT_LANDING_PATH;
}

export function focusFeedInlineCompose(): void {
  if (typeof document === "undefined") return;
  const root = document.getElementById(FEED_INLINE_COMPOSE_ID);
  if (!root) return;
  root.scrollIntoView({ behavior: "smooth", block: "start" });
  const main = document.getElementById("mocomo-main-scroll");
  if (main) {
    main.scrollTo({ top: 0, behavior: "smooth" });
  }
  window.requestAnimationFrame(() => {
    const field = root.querySelector<HTMLElement>(
      "textarea, [contenteditable='true']"
    );
    field?.focus();
  });
}
