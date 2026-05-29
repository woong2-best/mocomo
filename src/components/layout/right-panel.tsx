import {
  getCachedPopularAnime,
  getCachedSidebarAds,
  getCachedSidebarTips,
} from "@/lib/cached-data";
import { RightPanelContent } from "@/components/layout/right-panel-content";

export { RightPanelSkeleton } from "@/components/layout/right-panel-content";

/** 서버에서 직접 패널이 필요한 페이지용 (대부분은 RightPanelLoader 사용) */
export async function RightPanel() {
  try {
    const [animes, tips, sidebarAds] = await Promise.all([
      getCachedPopularAnime(),
      getCachedSidebarTips(),
      getCachedSidebarAds(),
    ]);
    return <RightPanelContent animes={animes} tips={tips} sidebarAds={sidebarAds} />;
  } catch {
    return <RightPanelContent animes={[]} tips={[]} sidebarAds={[]} />;
  }
}
