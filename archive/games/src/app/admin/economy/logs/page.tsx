import { AdminCsPanel } from "@/components/admin/admin-cs-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { ClipboardList } from "lucide-react";

export default function AdminEconomyLogsPage() {
  return (
    <AdminPageChrome
      maxWidth="6xl"
      backHref="/admin/economy"
      backLabel="Economy Dashboard"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Economy Logs (CS)
        </h1>
      }
    >
      <AdminCsPanel />
    </AdminPageChrome>
  );
}
