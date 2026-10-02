import { getEconomyFlagsAdminPageData } from "@/actions/admin-economy-flags";
import { AdminEconomyFlagsPanel } from "@/components/admin/admin-economy-flags-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Power } from "lucide-react";

export default async function AdminEconomyFlagsPage() {
  let data: Awaited<ReturnType<typeof getEconomyFlagsAdminPageData>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getEconomyFlagsAdminPageData();
  } catch (e) {
    if (isAdminForbiddenError(e)) forbidden = true;
    else loadFailed = true;
  }

  if (forbidden) return <AdminAccessDenied />;
  if (loadFailed || !data) return <AdminLoadError />;

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
