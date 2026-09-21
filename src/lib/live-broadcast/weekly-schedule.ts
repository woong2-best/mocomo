/** Weekly live schedule helpers — weekday 0=Sun … 6=Sat (JS Date.getDay). */

export type WeeklySchedule = {
  weekdays: number[];
  time: string | null;
  note: string | null;
};

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function parseScheduleTime(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function normalizeScheduleWeekdays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<number>();
  for (const v of raw) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isInteger(n) && n >= 0 && n <= 6) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export function formatScheduleMemo(schedule: WeeklySchedule): string {
  const days =
    schedule.weekdays.length > 0
      ? schedule.weekdays.map((d) => `매주 ${WEEKDAY_KO[d]}`).join(" · ")
      : "매주";
  const time = schedule.time ? `${schedule.time}` : "";
  const head = [days, time].filter(Boolean).join(" ");
  const note = schedule.note?.trim();
  if (note && head) return `📺 방송 ${head}\n${note}`;
  if (note) return `📺 방송\n${note}`;
  if (head) return `📺 방송 ${head}`;
  return "📺 방송 일정";
}

/** Expand weekly slots into dateKey → memo for one calendar month. */
export function expandWeeklyScheduleToMonth(
  year: number,
  month: number,
  schedule: WeeklySchedule
): Record<string, string> {
  const weekdays = new Set(schedule.weekdays);
  if (weekdays.size === 0) return {};

  const memo = formatScheduleMemo(schedule);
  const out: Record<string, string> = {};
  const last = new Date(year, month, 0).getDate();
  for (let d = 1; d <= last; d++) {
    const wd = new Date(year, month - 1, d).getDay();
    if (!weekdays.has(wd)) continue;
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    out[key] = memo;
  }
  return out;
}

export function mergeScheduleIntoMemos(
  memos: Record<string, string>,
  scheduleMemos: Record<string, string>
): {
  memos: Record<string, string>;
  scheduleKeys: string[];
} {
  const merged = { ...memos };
  const scheduleKeys: string[] = [];
  for (const [key, body] of Object.entries(scheduleMemos)) {
    scheduleKeys.push(key);
    if (!merged[key]?.trim()) {
      merged[key] = body;
    } else if (!merged[key].includes("📺")) {
      merged[key] = `${body}\n\n${merged[key]}`;
    }
  }
  return { memos: merged, scheduleKeys };
}
