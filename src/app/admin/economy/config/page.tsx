import { getEconomyConfigAdminPageData } from "@/actions/admin-economy-config";
import { AdminEconomyConfigPanel } from "@/components/admin/admin-economy-config-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Settings } from "lucide-react";

export default async function AdminEconomyConfigPage() {
  let data: Awaited<ReturnType<typeof getEconomyConfigAdminPageData>> | null = null;
  try {
    data = await getEconomyConfigAdminPageData();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <p className="text-muted-foreground">관리자 권한이 필요합니다.</p>
      </div>
    );
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
