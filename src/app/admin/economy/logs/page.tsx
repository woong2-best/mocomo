import { AdminCsPanel } from "@/components/admin/admin-cs-panel";
import { ClipboardList, ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function AdminEconomyLogsPage() {
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 pb-24">
      <Link href="/admin/economy" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        Economy Dashboard
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ClipboardList className="h-6 w-6" />
        Economy Logs (CS)
      </h1>
      <AdminCsPanel />
    </div>
  );
}
