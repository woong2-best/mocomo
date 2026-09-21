import { db } from "@/lib/db";
import {
  expandWeeklyScheduleToMonth,
  normalizeScheduleWeekdays,
} from "@/lib/live-broadcast/weekly-schedule";

/**
 * Load user calendar memos for a month.
 * Date memos stay separate from weekly broadcast schedule (headers only).
 */
export async function getCalendarMemosForMonth(userId: string, year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;

  const [rows, profile] = await Promise.all([
    db.calendarMemo.findMany({
      where: { userId, dateKey: { gte: from, lte: to } },
      select: { dateKey: true, body: true },
      orderBy: { dateKey: "asc" },
    }),
    db.streamerProfile.findUnique({
      where: { userId },
      select: {
        scheduleWeekdays: true,
        scheduleTime: true,
        scheduleNote: true,
      },
    }),
  ]);

  const memos: Record<string, string> = {};
  for (const row of rows) memos[row.dateKey] = row.body;

  const weekdays = normalizeScheduleWeekdays(profile?.scheduleWeekdays ?? []);
  const scheduleTime = profile?.scheduleTime?.trim() || null;
  const scheduleNote = profile?.scheduleNote?.trim() || null;

  const scheduleKeys =
    weekdays.length > 0
      ? Object.keys(
          expandWeeklyScheduleToMonth(year, month, {
            weekdays,
            time: scheduleTime,
            note: scheduleNote,
          })
        )
      : [];

  return {
    memos,
    scheduleKeys,
    scheduleWeekdays: weekdays,
    scheduleTime,
    scheduleNote,
  };
}
