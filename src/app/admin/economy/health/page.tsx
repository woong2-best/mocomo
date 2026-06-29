import { getEconomyHealthAdminPageData } from "@/actions/admin-economy-health";
import { AdminEconomyHealthPanel } from "@/components/admin/admin-economy-health-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Activity } from "lucide-react";

export default async function AdminEconomyHealthPage() {
  let data: Awaited<ReturnType<typeof getEconomyHealthAdminPageData>> | null = null;
  try {
    data = await getEconomyHealthAdminPageData();
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
      maxWidth="6xl"
      backHref="/admin/economy"
      backLabel="Economy Dashboard"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Health Monitor
        </h1>
      }
    >
      <AdminEconomyHealthPanel {...data} />
    </AdminPageChrome>
  );
}
