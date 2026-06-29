import { getEconomyDashboard } from "@/actions/admin-apt-economy";
import { AdminEconomyDashboard } from "@/components/admin/admin-economy-dashboard";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Coins } from "lucide-react";

export default async function AdminEconomyPage() {
  let data: Awaited<ReturnType<typeof getEconomyDashboard>> | null = null;
  try {
    data = await getEconomyDashboard();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">관리자 권한이 필요합니다.</p>
      </div>
    );
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
