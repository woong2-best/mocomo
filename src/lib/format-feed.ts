import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

/** 피드 상대 시간 — "4일" (전/후 접미사 없음) */
export function formatFeedRelativeTime(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: false, locale: ko });
}

/** 피드 숫자 — 3.2천, 1.5만 */
export function formatCompactNumberKo(n: number): string {
  if (n >= 100_000_000) {
    const v = n / 100_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}억`;
  }
  if (n >= 10_000) {
    const v = n / 10_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}만`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}천`;
  }
  return String(n);
}

export function postHasVisualMedia(post: {
  media?: { url?: string | null; type?: string; locked?: boolean }[];
}): boolean {
  const m = post.media?.[0];
  if (!m) return false;
  if (m.locked) return true;
  return m.type === "IMAGE" || m.type === "VIDEO" || Boolean(m.url?.trim());
}

/** Twitter-style timeline crop: never taller than 3:4, never wider than 1.91:1. */
export const FEED_MEDIA_MIN_ASPECT = 3 / 4;
export const FEED_MEDIA_MAX_ASPECT = 1.91;
/** Bind height even on wide desktop columns (`aspect-ratio` + max-height is unreliable). */
export const FEED_MEDIA_MAX_HEIGHT_CSS = "510px, 56vh";

export function clampFeedMediaAspect(
  width?: number | null,
  height?: number | null,
  type?: string
): number {
  if (width && height && width > 0 && height > 0) {
    return Math.min(Math.max(width / height, FEED_MEDIA_MIN_ASPECT), FEED_MEDIA_MAX_ASPECT);
  }
  return type === "VIDEO" ? 16 / 9 : 16 / 10;
}

/** CSS height: natural clamped ratio, then Twitter 510px / 56vh cap. Parent needs `container-type: inline-size`. */
export function feedMediaFrameHeightCss(aspect: number): string {
  return `min(calc(100cqi / ${aspect}), ${FEED_MEDIA_MAX_HEIGHT_CSS})`;
}

/** Portrait photos and videos keep their own ratio and shrink. Landscape stays full column width. */
export function isPortraitMedia(media: {
  width?: number | null;
  height?: number | null;
  type?: string;
}): boolean {
  return !!media.width && !!media.height && media.width > 0 && media.height > media.width;
}

export function feedMediaFrameStyle(media: {
  width?: number | null;
  height?: number | null;
  type?: string;
}): { width: string; height?: string; maxHeight?: string; maxWidth?: string; aspectRatio?: string } {
  if (isPortraitMedia(media) && media.width && media.height) {
    const aspect = media.width / media.height;
    const maxH = `min(${FEED_MEDIA_MAX_HEIGHT_CSS})`;
    return {
      width: `min(100%, calc(${maxH} * ${aspect}))`,
      height: maxH,
      maxWidth: "100%",
    };
  }
  const aspect = clampFeedMediaAspect(media.width, media.height, media.type);
  return {
    width: "100%",
    height: "auto",
    aspectRatio: String(aspect),
    maxHeight: `min(${FEED_MEDIA_MAX_HEIGHT_CSS})`,
  };
}

/** Single-tile feed/detail/carousel aspect ratio (clamped width/height or sensible default). */
export function postMediaAspectRatio(media: {
  width?: number | null;
  height?: number | null;
  type?: string;
}): string {
  return String(clampFeedMediaAspect(media.width, media.height, media.type));
}
