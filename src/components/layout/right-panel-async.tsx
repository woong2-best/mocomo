import { headers } from "next/headers";
import { getCachedSidebarPanelData } from "@/lib/cached-data";
import { shouldShowRightPanel } from "@/lib/sidebar-panel-paths";
import { RightPanelHydrated } from "@/components/layout/right-panel-hydrated";

export async function RightPanelAsync() {
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const initialData = shouldShowRightPanel(pathname)
    ? await getCachedSidebarPanelData()
    : null;

  return <RightPanelHydrated initialData={initialData} />;
}
