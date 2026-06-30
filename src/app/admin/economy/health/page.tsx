import { getEconomyHealthAdminPageData } from "@/actions/admin-economy-health";
import { AdminEconomyHealthPanel } from "@/components/admin/admin-economy-health-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Activity } from "lucide-react";

export default async function AdminEconomyHealthPage() {
  let data: Awaited<ReturnType<typeof getEconomyHealthAdminPageData>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getEconomyHealthAdminPageData();
  } catch (e) {
    if (isAdminForbiddenError(e)) forbidden = true;
    else loadFailed = true;
  }

  if (forbidden) return <AdminAccessDenied />;
  if (loadFailed || !data) return <AdminLoadError />;

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
