import { getEconomyBackupAdminPageData } from "@/actions/admin-economy-backup";
import { AdminEconomyBackupPanel } from "@/components/admin/admin-economy-backup-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Archive } from "lucide-react";

export default async function AdminEconomyBackupPage() {
  let data: Awaited<ReturnType<typeof getEconomyBackupAdminPageData>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getEconomyBackupAdminPageData();
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
          <Archive className="h-6 w-6" />
          Backup & Restore
        </h1>
      }
    >
      <AdminEconomyBackupPanel snapshots={data.snapshots} restoreLogs={data.restoreLogs} />
    </AdminPageChrome>
  );
}
