import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";

/** 글쓰기 시트·딤 — 좌 사이드바·우 패널 사이 메인 열만 덮음 (lg+) */
export function composeSheetRegionClass(pathname: string, sidebarOpen = true) {
  const hasRight = shouldShowRightPanel(pathname);
  return [
    "lg:top-[var(--header-h)] lg:bottom-0",
    sidebarOpen ? "lg:left-[var(--sidebar-w)]" : "lg:left-0",
    hasRight ? "lg:right-[var(--right-panel-w)]" : "lg:right-0",
  ].join(" ");
}
