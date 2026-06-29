import { getFleaAdminPageData } from "@/actions/admin-flea";
import { AdminFleaPanel } from "@/components/admin/admin-flea-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Sparkles } from "lucide-react";

export default async function AdminFleaPage() {
  let data: Awaited<ReturnType<typeof getFleaAdminPageData>> | null = null;
  try {
    data = await getFleaAdminPageData();
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
