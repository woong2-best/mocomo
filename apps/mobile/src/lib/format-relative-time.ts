import { translate } from "@/i18n/runtime";

/** Instagram-style compact time for comment rows (e.g. "1s", "3w"). */
export function formatCommentTimeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const t = typeof iso === "string" || iso instanceof Date ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return "";
  const sec = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (sec < 60) return translate("m.reels.time_s", { n: String(sec) });
  const mins = Math.floor(sec / 60);
  if (mins < 60) return translate("m.reels.time_m", { n: String(mins) });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return translate("m.reels.time_h", { n: String(hours) });
  const days = Math.floor(hours / 24);
  if (days < 7) return translate("m.reels.time_d", { n: String(days) });
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return translate("m.reels.time_w", { n: String(weeks) });
  const months = Math.floor(days / 30);
  if (months < 12) return translate("m.reels.time_mo", { n: String(Math.max(1, months)) });
  return translate("m.reels.time_y", { n: String(Math.floor(days / 365)) });
}

/** Compact relative time for feed / post headers (e.g. "13d ago"). */
export function formatRelativeTimeAgo(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  const t = typeof iso === "string" || iso instanceof Date ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return translate("m.common.just_now");
  if (mins < 60) return translate("m.marketplace.mins_m_ago", { mins: String(mins) });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return translate("m.marketplace.hours_h_ago", { hours: String(hours) });
  const days = Math.floor(hours / 24);
  if (days < 30) return translate("m.marketplace.days_d_ago", { days: String(days) });
  const months = Math.floor(days / 30);
  if (months < 12) return translate("m.marketplace.months_mo_ago", { months: String(months) });
  return translate("m.lib.floor_y_ago", { floor: String(Math.floor(days / 365)) });
}
