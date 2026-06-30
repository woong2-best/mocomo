import { getMarketAdminPageDataAction } from "@/actions/admin-market";
import { AdminMarketPanel } from "@/components/admin/admin-market-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { Store } from "lucide-react";

export default async function AdminMarketPage() {
  let data: Awaited<ReturnType<typeof getMarketAdminPageDataAction>> | null = null;
  try {
    data = await getMarketAdminPageDataAction();
  } catch {
    data = null;
  }

  if (!data) {
    return <AdminAccessDenied />;
  }

  return (
    <AdminPageChrome
      maxWidth="6xl"
      backHref="/admin/economy"
      backLabel="Economy Dashboard"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="h-6 w-6" />
          Market Admin
        </h1>
      }
    >
      <AdminMarketPanel
        kpi={data.kpi}
        listings={data.listings}
        flags={data.flags}
        logs={data.logs}
        analytics={data.analytics}
        hot={data.hot}
        priceGuide={data.priceGuide}
        npcRules={data.npcRules}
      />
    </AdminPageChrome>
  );
}
