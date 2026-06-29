import { AdminEconomyNotificationsPanel } from "@/components/admin/admin-economy-notifications-panel";
import Link from "next/link";
import { ChevronLeft, Megaphone } from "lucide-react";

export default function AdminEconomyNotificationsPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-24">
      <Link href="/admin/economy" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" />
        Economy Dashboard
      </Link>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Megaphone className="h-6 w-6" />
        Economy Notifications
      </h1>
      <AdminEconomyNotificationsPanel />
    </div>
  );
}
