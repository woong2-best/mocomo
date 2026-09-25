import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export async function fetchCalendarMemos(year: number, month: number) {
  return apiRequest<{
    ok: boolean;
    memos: Record<string, string>;
    scheduleKeys?: string[];
    scheduleWeekdays?: number[];
    scheduleTime?: string | null;
    scheduleNote?: string | null;
  }>(`${MobileApi.calendarMemos}?year=${year}&month=${month}`, { auth: true });
}

export async function saveCalendarMemo(dateKey: string, body: string) {
  return apiRequest<{ ok: boolean }>(MobileApi.calendarMemos, {
    method: "PUT",
    body: { dateKey, body },
    auth: true,
  });
}
