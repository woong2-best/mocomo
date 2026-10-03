/** Korean public holidays + calendar display helpers (profile calendar). */

import { translate } from "@/i18n/runtime";

const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "m.calendar.holiday_new_year",
  "03-01": "m.calendar.holiday_independence",
  "05-05": "m.calendar.holiday_children",
  "06-06": "m.calendar.holiday_memorial",
  "08-15": "m.calendar.holiday_liberation",
  "10-03": "m.calendar.holiday_foundation",
  "10-09": "m.calendar.holiday_hangeul",
  "12-25": "m.calendar.holiday_christmas",
};

const MOVABLE_HOLIDAYS: Record<string, string> = {
  "2025-01-28": "m.calendar.lunar_new_year_eve_2025",
  "2025-01-29": "m.calendar.lunar_new_year_2025",
  "2025-01-30": "m.calendar.lunar_new_year_day2_2025",
  "2025-03-03": "m.calendar.independence_substitute_2025",
  "2025-05-05": "m.calendar.children_buddha_2025",
  "2025-05-06": "m.calendar.children_substitute_2025",
  "2025-10-05": "m.calendar.chuseok_eve_2025",
  "2025-10-06": "m.calendar.chuseok_2025",
  "2025-10-07": "m.calendar.chuseok_day2_2025",
  "2025-10-08": "m.calendar.chuseok_substitute_2025",
  "2026-02-16": "m.calendar.lunar_new_year_eve_2026",
  "2026-02-17": "m.calendar.lunar_new_year_2026",
  "2026-02-18": "m.calendar.lunar_new_year_day2_2026",
  "2026-05-24": "m.calendar.buddha_2026",
  "2026-05-25": "m.calendar.buddha_substitute_2026",
  "2026-09-24": "m.calendar.chuseok_eve_2026",
  "2026-09-25": "m.calendar.chuseok_2026",
  "2026-09-26": "m.calendar.chuseok_day2_2026",
  "2026-10-05": "m.calendar.foundation_substitute_2026",
  "2027-02-06": "m.calendar.lunar_new_year_eve_2027",
  "2027-02-07": "m.calendar.lunar_new_year_2027",
  "2027-02-08": "m.calendar.lunar_new_year_day2_2027",
  "2027-02-09": "m.calendar.lunar_new_year_substitute_2027",
  "2027-05-13": "m.calendar.buddha_2027",
  "2027-09-14": "m.calendar.chuseok_eve_2027",
  "2027-09-15": "m.calendar.chuseok_2027",
  "2027-09-16": "m.calendar.chuseok_day2_2027",
  "2028-01-26": "m.calendar.lunar_new_year_eve_2028",
  "2028-01-27": "m.calendar.lunar_new_year_2028",
  "2028-01-28": "m.calendar.lunar_new_year_day2_2028",
  "2028-05-02": "m.calendar.buddha_2028",
  "2028-10-02": "m.calendar.chuseok_eve_2028",
  "2028-10-03": "m.calendar.chuseok_foundation_2028",
  "2028-10-04": "m.calendar.chuseok_day2_2028",
  "2028-10-05": "m.calendar.chuseok_substitute_2028",
};

const OBSERVANCES: Record<string, string> = {
  "10-01": "m.calendar.observance_armed_forces",
};

const WEEKDAY_HAN = ["\u65e5", "\u6708", "\u706b", "\u6c34", "\u6728", "\u91d1", "\u571f"] as const;
const WEEKDAY_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
const GAN = ["\u7532", "\u4e59", "\u4e19", "\u4e01", "\u620a", "\u5df1", "\u5e9a", "\u8f9b", "\u58ec", "\u7678"] as const;
const ZHI = ["\u5b50", "\u4e11", "\u5bc5", "\u536f", "\u8fb0", "\u5df3", "\u5348", "\u672a", "\u7533", "\u9149", "\u620c", "\u4ea5"] as const;

export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseDateKey(key: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Returns an i18n key for the holiday, or null. */
export function getHolidayKey(y: number, m: number, d: number): string | null {
  const full = dateKey(y, m, d);
  if (MOVABLE_HOLIDAYS[full]) return MOVABLE_HOLIDAYS[full];
  const md = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (FIXED_HOLIDAYS[md]) return FIXED_HOLIDAYS[md];
  if (OBSERVANCES[md]) return OBSERVANCES[md];
  return null;
}

/** Localized holiday label for UI. */
export function getHolidayName(y: number, m: number, d: number): string | null {
  const key = getHolidayKey(y, m, d);
  return key ? translate(key) : null;
}

export function isHolidayOrSunday(y: number, m: number, d: number, weekday: number): boolean {
  if (weekday === 0) return true;
  const full = dateKey(y, m, d);
  if (MOVABLE_HOLIDAYS[full]) return true;
  const md = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return Boolean(FIXED_HOLIDAYS[md]);
}

export function sexagenaryYear(year: number): string {
  const offset = year - 1984;
  const gan = GAN[((offset % 10) + 10) % 10];
  const zhi = ZHI[((offset % 12) + 12) % 12];
  return `${gan}${zhi}\u5e74`;
}

export function monthEn(month: number): string {
  return MONTH_EN[month - 1] ?? "";
}

export function weekdayLabels(): { han: string; en: string }[] {
  return WEEKDAY_HAN.map((han, i) => ({ han, en: WEEKDAY_EN[i] }));
}

export type CalendarCell = {
  y: number;
  m: number;
  d: number;
  inMonth: boolean;
  weekday: number;
  holiday: string | null;
  isRed: boolean;
  isBlue: boolean;
};

export function buildMonthGrid(
  year: number,
  month: number,
  options?: { holidays?: boolean }
): CalendarCell[] {
  const useHolidays = options?.holidays !== false;
  const first = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const startWeekday = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12, 0, 0)).getUTCDate();
  const prevDays = new Date(Date.UTC(year, month - 1, 0, 12, 0, 0)).getUTCDate();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    const d = prevDays - startWeekday + 1 + i;
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    const weekday = i;
    const holiday = useHolidays ? getHolidayName(y, m, d) : null;
    cells.push({
      y,
      m,
      d,
      inMonth: false,
      weekday,
      holiday,
      isRed: weekday === 0 || Boolean(holiday && isHolidayOrSunday(y, m, d, weekday)),
      isBlue: weekday === 6,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const weekday = (startWeekday + d - 1) % 7;
    const holiday = useHolidays ? getHolidayName(year, month, d) : null;
    const red = useHolidays
      ? isHolidayOrSunday(year, month, d, weekday)
      : weekday === 0;
    cells.push({
      y: year,
      m: month,
      d,
      inMonth: true,
      weekday,
      holiday,
      isRed: red,
      isBlue: weekday === 6 && !red,
    });
  }

  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= trailing; i++) {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    const weekday = (cells.length + i - 1) % 7;
    const holiday = useHolidays ? getHolidayName(y, m, i) : null;
    cells.push({
      y,
      m,
      d: i,
      inMonth: false,
      weekday,
      holiday,
      isRed: weekday === 0 || Boolean(holiday),
      isBlue: weekday === 6,
    });
  }

  return cells;
}

export function todayPartsInTimeZone(timeZone: string): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = fmt.formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year")?.value ?? "1970");
  const m = Number(parts.find((p) => p.type === "month")?.value ?? "1");
  const d = Number(parts.find((p) => p.type === "day")?.value ?? "1");
  return { y, m, d };
}
