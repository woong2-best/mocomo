import Link from "next/link";
import { getEconomyBackupAdminPageData } from "@/actions/admin-economy-backup";
import { AdminEconomyBackupPanel } from "@/components/admin/admin-economy-backup-panel";
import { Archive, ChevronLeft } from "lucide-react";

export default async function AdminEconomyBackupPage() {
  let data: Awaited<ReturnType<typeof getEconomyBackupAdminPageData>> | null = null;
  try {
    data = await getEconomyBackupAdminPageData();
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
    <div className="max-w-6xl mx-auto p-4 space-y-4 pb-24">
      <Link href="/admin/economy" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        Economy Dashboard
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Archive className="h-6 w-6" />
        Backup & Restore
      </h1>
      <AdminEconomyBackupPanel snapshots={data.snapshots} restoreLogs={data.restoreLogs} />
    </div>
  );
}
