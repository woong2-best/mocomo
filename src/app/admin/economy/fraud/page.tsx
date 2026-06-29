import { getFraudAdminPageData } from "@/actions/admin-fraud";
import { AdminFraudPanel } from "@/components/admin/admin-fraud-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { ShieldAlert } from "lucide-react";

export default async function AdminFraudPage() {
  let data: Awaited<ReturnType<typeof getFraudAdminPageData>> | null = null;
  try {
    data = await getFraudAdminPageData();
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
      maxWidth="5xl"
      backHref="/admin/economy"
      backLabel="Economy Dashboard"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldAlert className="h-6 w-6" />
          Fraud Detection
        </h1>
      }
    >
      <AdminFraudPanel stats={data.stats} profiles={data.profiles} />
    </AdminPageChrome>
  );
}
