/** Compact relative time for feed / post headers (e.g. "13일 전"). */
export function formatRelativeTimeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const t = typeof iso === "string" || iso instanceof Date ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}
