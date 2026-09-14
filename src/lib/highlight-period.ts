/** Calendar-month window for home highlights (KST, 1st 00:00 → next month 1st). */
export const HIGHLIGHTS_TIMEZONE = "Asia/Seoul";

function seoulYmd(now: Date): { y: string; m: string } {
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: HIGHLIGHTS_TIMEZONE, year: "numeric" }).format(
    now
  );
  const m = new Intl.DateTimeFormat("en-CA", { timeZone: HIGHLIGHTS_TIMEZONE, month: "2-digit" }).format(
    now
  );
  return { y, m };
}

/** UTC instant for the 1st 00:00 KST of the current calendar month. */
export function getHighlightPeriodStart(now = new Date()): Date {
  const { y, m } = seoulYmd(now);
  return new Date(`${y}-${m}-01T00:00:00+09:00`);
}

/** Cache key segment, e.g. `2025-09`. */
export function getHighlightPeriodKey(now = new Date()): string {
  const { y, m } = seoulYmd(now);
  return `${y}-${m}`;
}

/** Localized range label for UI, e.g. `Sep 1 – Sep 30` (en) or `9월 1일 – 9월 30일` (ko). */
export function formatHighlightPeriodRange(locale: string, now = new Date()): string {
  const start = getHighlightPeriodStart(now);
  const { y, m } = seoulYmd(now);
  const month = Number(m);
  const year = Number(y);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endExclusive = new Date(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+09:00`
  );
  const end = new Date(endExclusive.getTime() - 1);

  const fmt = new Intl.DateTimeFormat(locale, {
    timeZone: HIGHLIGHTS_TIMEZONE,
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}
