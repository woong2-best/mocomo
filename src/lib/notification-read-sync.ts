/** 알림 페이지 방문·읽음 처리 후 사이드바·벨 배지 동기화 */
export const NOTIFICATIONS_READ_EVENT = "mocomo:notifications-read";

export function clearBrowserAppBadge(): void {
  if (typeof navigator === "undefined" || !("clearAppBadge" in navigator)) return;
  void navigator.clearAppBadge().catch(() => undefined);
}

export function dispatchNotificationsRead(): void {
  if (typeof window === "undefined") return;
  clearBrowserAppBadge();
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
}
