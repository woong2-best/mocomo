import Link from "next/link";
import { getEconomyConfigAdminPageData } from "@/actions/admin-economy-config";
import { AdminEconomyConfigPanel } from "@/components/admin/admin-economy-config-panel";
import { ChevronLeft, Settings } from "lucide-react";

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
    <div className="max-w-5xl mx-auto p-4 space-y-4 pb-24">
      <Link href="/admin/economy" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        Economy Dashboard
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6" />
        Economy Config & Live Ops
      </h1>
      <AdminEconomyConfigPanel config={data.config} changeLogs={data.changeLogs} />
    </div>
  );
}
