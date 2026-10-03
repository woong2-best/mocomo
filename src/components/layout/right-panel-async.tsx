import { headers } from "next/headers";
import { getCachedSidebarPanelData } from "@/lib/cached-data";
import {
  resolveSubculturePinsForUser,
  selectSidebarEventPins,
} from "@/lib/subculture-event-countries";
import { getRequestCountryCode } from "@/lib/i18n/server";
import {
  shouldShowDefaultRightPanel,
  shouldShowRightPanel,
} from "@/lib/sidebar-panel-paths";
import { RightPanelHydrated } from "@/components/layout/right-panel-hydrated";
import { getSponsorSpotPreview } from "@/lib/sponsor-spot-server";

export async function RightPanelAsync() {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const show = shouldShowRightPanel(pathname);
  if (!show || !shouldShowDefaultRightPanel(pathname)) {
    return <RightPanelHydrated initialData={null} countryCode="KR" />;
  }

  let raw: Awaited<ReturnType<typeof getCachedSidebarPanelData>>;
  try {
    raw = await getCachedSidebarPanelData(pathname);
  } catch (e) {
    console.error("[RightPanelAsync] sidebar panel data failed", e);
    raw = { tips: [], sidebarAds: [], eventPins: [] };
  }

  const [countryCode, sponsorEvent] = await Promise.all([
    getRequestCountryCode(),
    getSponsorSpotPreview(),
  ]);
  const eventPins = selectSidebarEventPins(
    resolveSubculturePinsForUser(raw.eventPins, countryCode)
  );

  return (
    <RightPanelHydrated
      initialData={{ ...raw, eventPins, sponsorEvent }}
      countryCode={countryCode}
    />
  );
}
