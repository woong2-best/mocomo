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

export async function RightPanelAsync() {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const show = shouldShowRightPanel(pathname);
  if (!show || !shouldShowDefaultRightPanel(pathname)) {
    return <RightPanelHydrated initialData={null} countryCode="KR" />;
  }

  const [countryCode, raw] = await Promise.all([
    getRequestCountryCode(),
    getCachedSidebarPanelData(pathname),
  ]);
  const eventPins = selectSidebarEventPins(
    resolveSubculturePinsForUser(raw.eventPins, countryCode)
  );

  return (
    <RightPanelHydrated
      initialData={{ ...raw, eventPins }}
      countryCode={countryCode}
    />
  );
}
