import { getFleaAdminPageData } from "@/actions/admin-flea";
import { AdminFleaPanel } from "@/components/admin/admin-flea-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { Sparkles } from "lucide-react";

export default async function AdminFleaPage() {
  let data: Awaited<ReturnType<typeof getFleaAdminPageData>> | null = null;
  try {
    data = await getFleaAdminPageData();
  } catch {
    data = null;
  }

  if (!data) {
    return <AdminAccessDenied />;
  }

  return (
    <AdminPageChrome
      backHref="/admin/economy"
      backLabel="Economy Dashboard"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          Flea Event Admin
        </h1>
      }
    >
      <AdminFleaPanel events={data.events} catalogItems={data.catalogItems} />
    </AdminPageChrome>
  );
}
