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
