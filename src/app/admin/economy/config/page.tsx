import { getEconomyConfigAdminPageData } from "@/actions/admin-economy-config";
import { AdminEconomyConfigPanel } from "@/components/admin/admin-economy-config-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { Settings } from "lucide-react";

export default async function AdminEconomyConfigPage() {
  let data: Awaited<ReturnType<typeof getEconomyConfigAdminPageData>> | null = null;
  try {
    data = await getEconomyConfigAdminPageData();
  } catch {
    data = null;
  }

  if (!data) {
    return <AdminAccessDenied />;
  }

  return (
    <AdminPageChrome
      maxWidth="5xl"
      backHref="/admin/economy"
      backLabel="Economy Dashboard"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Economy Config & Live Ops
        </h1>
      }
    >
      <AdminEconomyConfigPanel config={data.config} changeLogs={data.changeLogs} />
    </AdminPageChrome>
  );
}
