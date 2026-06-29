import { getEconomyFlagsAdminPageData } from "@/actions/admin-economy-flags";
import { AdminEconomyFlagsPanel } from "@/components/admin/admin-economy-flags-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Power } from "lucide-react";

export default async function AdminEconomyFlagsPage() {
  let data: Awaited<ReturnType<typeof getEconomyFlagsAdminPageData>> | null = null;
  try {
    data = await getEconomyFlagsAdminPageData();
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
          <Power className="h-6 w-6" />
          Feature Flags (Kill Switch)
        </h1>
      }
    >
      <AdminEconomyFlagsPanel flags={data.flags} changeLogs={data.changeLogs} />
    </AdminPageChrome>
  );
}
