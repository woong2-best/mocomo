import { getEconomyDashboard } from "@/actions/admin-apt-economy";
import { AdminEconomyDashboard } from "@/components/admin/admin-economy-dashboard";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Coins } from "lucide-react";

export default async function AdminEconomyPage() {
  let data: Awaited<ReturnType<typeof getEconomyDashboard>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getEconomyDashboard();
  } catch (e) {
    if (isAdminForbiddenError(e)) forbidden = true;
    else loadFailed = true;
  }

  if (forbidden) return <AdminAccessDenied />;
  if (loadFailed || !data) return <AdminLoadError />;

  return (
    <AdminPageChrome
      maxWidth="4xl"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-6 w-6" />
          Economy Dashboard
        </h1>
      }
    >
      <AdminEconomyDashboard data={data} />
    </AdminPageChrome>
  );
}
