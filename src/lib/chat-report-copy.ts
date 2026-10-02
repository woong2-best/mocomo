export const CHAT_REPORT_LOCK_MESSAGE_KO =
  "신고가 접수되어 대화가 잠겼습니다. 메시지를 더 보낼 수 없으며, 기록은 보관됩니다.";
export const CHAT_REPORT_LOCK_MESSAGE_EN =
  "This conversation was locked after a report was filed. Messages can no longer be sent; records are preserved.";

export function chatReportLockMessage(locale: string): string {
  return CHAT_REPORT_LOCK_MESSAGE_EN;
}
