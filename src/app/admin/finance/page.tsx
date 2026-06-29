import { getFinanceDashboard } from "@/actions/admin-finance";
import { AdminFinancePanel } from "@/components/admin/admin-finance-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { Landmark } from "lucide-react";

export default async function AdminFinancePage() {
  let data: Awaited<ReturnType<typeof getFinanceDashboard>> | null = null;
  try {
    data = await getFinanceDashboard();
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <p className="text-muted-foreground">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  return (
    <AdminPageChrome
      maxWidth="4xl"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6" />
          매출 · 정산
        </h1>
      }
    >
      <AdminFinancePanel data={data} />
    </AdminPageChrome>
  );
}
