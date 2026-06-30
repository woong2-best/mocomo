import { getEconomyBackupAdminPageData } from "@/actions/admin-economy-backup";
import { AdminEconomyBackupPanel } from "@/components/admin/admin-economy-backup-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { Archive } from "lucide-react";

export default async function AdminEconomyBackupPage() {
  let data: Awaited<ReturnType<typeof getEconomyBackupAdminPageData>> | null = null;
  try {
    data = await getEconomyBackupAdminPageData();
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
          <Archive className="h-6 w-6" />
          Backup & Restore
        </h1>
      }
    >
      <AdminEconomyBackupPanel snapshots={data.snapshots} restoreLogs={data.restoreLogs} />
    </AdminPageChrome>
  );
}
