/** Korean public holidays + calendar display helpers (profile calendar). */

const FIXED_HOLIDAYS: Record<string, string> = {
  "01-01": "신정",
  "03-01": "삼일절",
  "05-05": "어린이날",
  "06-06": "현충일",
  "08-15": "광복절",
  "10-03": "개천절",
  "10-09": "한글날",
  "12-25": "성탄절",
};

const MOVABLE_HOLIDAYS: Record<string, string> = {
  "2025-01-28": "설날 연휴",
  "2025-01-29": "설날",
  "2025-01-30": "설날 연휴",
  "2025-03-03": "삼일절 대체휴일",
  "2025-05-05": "어린이날·부처님오신날",
  "2025-05-06": "어린이날 대체휴일",
  "2025-10-05": "추석 연휴",
  "2025-10-06": "추석",
  "2025-10-07": "추석 연휴",
  "2025-10-08": "추석 대체휴일",
  "2026-02-16": "설날 연휴",
  "2026-02-17": "설날",
  "2026-02-18": "설날 연휴",
  "2026-05-24": "부처님오신날",
  "2026-05-25": "부처님오신날 대체휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-05": "개천절 대체휴일",
  "2027-02-06": "설날 연휴",
  "2027-02-07": "설날",
  "2027-02-08": "설날 연휴",
  "2027-02-09": "설날 대체휴일",
  "2027-05-13": "부처님오신날",
  "2027-09-14": "추석 연휴",
  "2027-09-15": "추석",
  "2027-09-16": "추석 연휴",
  "2028-01-26": "설날 연휴",
  "2028-01-27": "설날",
  "2028-01-28": "설날 연휴",
  "2028-05-02": "부처님오신날",
  "2028-10-02": "추석 연휴",
  "2028-10-03": "추석·개천절",
  "2028-10-04": "추석 연휴",
  "2028-10-05": "추석 대체휴일",
};

const OBSERVANCES: Record<string, string> = {
  "10-01": "국군의 날",
};

const WEEKDAY_HAN = ["日", "月", "火", "水", "木", "金", "土"] as const;
const WEEKDAY_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
const MONTH_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
const GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseDateKey(key: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function getHolidayName(y: number, m: number, d: number): string | null {
  const full = dateKey(y, m, d);
  if (MOVABLE_HOLIDAYS[full]) return MOVABLE_HOLIDAYS[full];
  const md = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (FIXED_HOLIDAYS[md]) return FIXED_HOLIDAYS[md];
  if (OBSERVANCES[md]) return OBSERVANCES[md];
  return null;
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
  return `${gan}${zhi}年`;
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
