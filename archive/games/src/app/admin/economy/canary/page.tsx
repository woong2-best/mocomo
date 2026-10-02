import { getEconomyCanaryAdminPageData } from "@/actions/admin-economy-canary";
import { AdminEconomyCanaryPanel } from "@/components/admin/admin-economy-canary-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { FlaskConical } from "lucide-react";

export default async function AdminEconomyCanaryPage() {
  let data: Awaited<ReturnType<typeof getEconomyCanaryAdminPageData>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getEconomyCanaryAdminPageData();
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
          <FlaskConical className="h-6 w-6" />
          Canary Rollout
        </h1>
      }
    >
      <AdminEconomyCanaryPanel
        cards={data.cards}
        history={data.history}
        recentSnapshots={data.recentSnapshots}
      />
    </AdminPageChrome>
  );
}
