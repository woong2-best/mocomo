import { getFleaAdminPageData } from "@/actions/admin-flea";
import { AdminFleaPanel } from "@/components/admin/admin-flea-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Sparkles } from "lucide-react";

export default async function AdminFleaPage() {
  let data: Awaited<ReturnType<typeof getFleaAdminPageData>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getFleaAdminPageData();
  } catch (e) {
    if (isAdminForbiddenError(e)) forbidden = true;
    else loadFailed = true;
  }

  if (forbidden) return <AdminAccessDenied />;
  if (loadFailed || !data) return <AdminLoadError />;

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
