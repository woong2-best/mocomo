/** 거래 약속일 다음날 0시부터 완료 확인 UI 노출 */
export function isUsedTradeMeetCompletionDue(meetAt: Date, now = new Date()): boolean {
  const due = new Date(meetAt);
  due.setDate(due.getDate() + 1);
  due.setHours(0, 0, 0, 0);
  return now.getTime() >= due.getTime();
}

export function parseMeetTimeInput(text: string): { hours: number; minutes: number } | null {
  const m = text.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}
