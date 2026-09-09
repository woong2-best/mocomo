import {
  getCachedSidebarPanelData,
  getCachedSidebarAds,
  getCachedSidebarTips,
} from "@/lib/cached-data";
import { RightPanelContent } from "@/components/layout/right-panel-content";
import { getSubcultureMapPins } from "@/lib/subculture-events";
import { resolveSubculturePinsForUser } from "@/lib/subculture-event-countries";
import { getRequestCountryCode } from "@/lib/i18n/server";

export { RightPanelSkeleton } from "@/components/layout/right-panel-content";

/** 서버에서 직접 패널이 필요한 페이지용 (대부분은 RightPanelLoader 사용) */
export async function RightPanel({ pathname = "/" }: { pathname?: string }) {
  try {
    const countryCode = await getRequestCountryCode();
    const [raw, allPins] = await Promise.all([
      getCachedSidebarPanelData(pathname),
      getSubcultureMapPins(160),
    ]);
    const eventPins = resolveSubculturePinsForUser(allPins, countryCode).slice(0, 36);
    return (
      <RightPanelContent
        trendingQueries={raw.trendingQueries}
        searchRankingScope={raw.searchRankingScope}
        tips={raw.tips}
        sidebarAds={raw.sidebarAds}
        eventPins={eventPins}
      />
    );
  } catch {
    return (
      <RightPanelContent
        trendingQueries={[]}
        searchRankingScope="global"
        tips={[]}
        sidebarAds={[]}
        eventPins={[]}
      />
    );
  }
}
