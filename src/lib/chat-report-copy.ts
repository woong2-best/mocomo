export const CHAT_REPORT_LOCK_MESSAGE_KO =
  "Report received. This chat is locked—you can't send more messages. History is kept.";
export const CHAT_REPORT_LOCK_MESSAGE_EN =
  "This conversation was locked after a report was filed. Messages can no longer be sent; records are preserved.";

export function chatReportLockMessage(locale: string): string {
  return CHAT_REPORT_LOCK_MESSAGE_EN;
}
