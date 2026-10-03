import { translate } from "@/i18n/runtime";

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
