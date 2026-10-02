import { AdminEconomyNotificationsPanel } from "@/components/admin/admin-economy-notifications-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Megaphone } from "lucide-react";

export default function AdminEconomyNotificationsPage() {
  return (
    <AdminPageChrome
      maxWidth="2xl"
      backHref="/admin/economy"
      backLabel="Economy Dashboard"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6" />
          Economy Notifications
        </h1>
      }
    >
      <AdminEconomyNotificationsPanel />
    </AdminPageChrome>
  );
}
