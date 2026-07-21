import { headers } from "next/headers";
import { getCachedSidebarPanelData } from "@/lib/cached-data";
import { resolveSubculturePinsForUser } from "@/lib/subculture-event-countries";
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

  const countryCode = await getRequestCountryCode();
  const raw = await getCachedSidebarPanelData();
  const eventPins = resolveSubculturePinsForUser(raw.eventPins, countryCode).slice(0, 12);

  return (
    <RightPanelHydrated
      initialData={{ ...raw, eventPins }}
      countryCode={countryCode}
    />
  );
}
