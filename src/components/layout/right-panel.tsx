import {
  getCachedSidebarPanelData,
  getCachedSidebarAds,
  getCachedSidebarTips,
} from "@/lib/cached-data";
import { RightPanelContent } from "@/components/layout/right-panel-content";
import { getSubcultureMapPins } from "@/lib/subculture-events";
import {
  resolveSubculturePinsForUser,
  selectSidebarEventPins,
} from "@/lib/subculture-event-countries";
import { getRequestCountryCode } from "@/lib/i18n/server";

export { RightPanelSkeleton } from "@/components/layout/right-panel-content";

/** 서버에서 직접 패널이 필요한 페이지용 (대부분은 RightPanelLoader 사용) */
export async function RightPanel() {
  try {
    const countryCode = await getRequestCountryCode();
    const [raw, allPins] = await Promise.all([
      getCachedSidebarPanelData(),
      getSubcultureMapPins(160),
    ]);
    const eventPins = selectSidebarEventPins(
      resolveSubculturePinsForUser(allPins, countryCode),
      24
    );
    return (
      <RightPanelContent
        tips={raw.tips}
        sidebarAds={raw.sidebarAds}
        eventPins={eventPins}
      />
    );
  } catch {
    return (
      <RightPanelContent
        tips={[]}
        sidebarAds={[]}
        eventPins={[]}
      />
    );
  }
}
