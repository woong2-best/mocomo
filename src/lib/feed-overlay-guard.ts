/** 피드·라이트박스·영상 뷰어 등 오버레이가 열려 있을 때 router.refresh()로 UI가 날아가지 않게 막는다. */

let overlayCount = 0;

export function registerFeedOverlay(): () => void {
  overlayCount += 1;
  return () => {
    overlayCount = Math.max(0, overlayCount - 1);
  };
}

export function isFeedOverlayOpen(): boolean {
  return overlayCount > 0;
}

export function safeRouterRefresh(refresh: () => void): boolean {
  if (isFeedOverlayOpen()) return false;
  refresh();
  return true;
}
