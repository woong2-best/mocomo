import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";

/** 글쓰기 시트·딤 — 좌 사이드바·우 패널 사이 메인 열만 덮음 (lg+) */
export function composeSheetRegionClass(pathname: string) {
  const hasRight = shouldShowRightPanel(pathname);
  return [
    "lg:top-[var(--header-h)] lg:bottom-0",
    "lg:left-[17rem] xl:left-[18rem]",
    hasRight ? "lg:right-64 xl:right-72" : "lg:right-0",
  ].join(" ");
}
