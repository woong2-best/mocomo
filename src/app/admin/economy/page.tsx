import { getEconomyDashboard } from "@/actions/admin-apt-economy";
import { AdminEconomyDashboard } from "@/components/admin/admin-economy-dashboard";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { Coins } from "lucide-react";

export default async function AdminEconomyPage() {
  let data: Awaited<ReturnType<typeof getEconomyDashboard>> | null = null;
  try {
    data = await getEconomyDashboard();
  } catch {
    data = null;
  }

  if (!data) {
    return <AdminAccessDenied />;
  }

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
