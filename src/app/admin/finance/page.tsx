import { getFinanceDashboard } from "@/actions/admin-finance";
import { AdminFinancePanel } from "@/components/admin/admin-finance-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Landmark } from "lucide-react";

export default async function AdminFinancePage() {
  let data: Awaited<ReturnType<typeof getFinanceDashboard>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getFinanceDashboard();
  } catch (e) {
    if (isAdminForbiddenError(e)) forbidden = true;
    else loadFailed = true;
  }

  if (forbidden) return <AdminAccessDenied />;
  if (loadFailed || !data) return <AdminLoadError />;

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
