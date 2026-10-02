import { getFraudRulesAdminPageDataAction } from "@/actions/admin-fraud-rules";
import { AdminFraudRulesPanel } from "@/components/admin/admin-fraud-rules-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { Settings2 } from "lucide-react";

export default async function AdminFraudRulesPage() {
  let data: Awaited<ReturnType<typeof getFraudRulesAdminPageDataAction>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getFraudRulesAdminPageDataAction();
  } catch (e) {
    if (isAdminForbiddenError(e)) forbidden = true;
    else loadFailed = true;
  }

  if (forbidden) return <AdminAccessDenied />;
  if (loadFailed || !data) return <AdminLoadError />;

  return (
    <AdminPageChrome
      maxWidth="6xl"
      backHref="/admin/economy/fraud"
      backLabel="Fraud Detection"
      title={
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          Fraud Rule Engine
        </h1>
      }
    >
      <AdminFraudRulesPanel rules={data.rules} meta={data.meta} changeLogs={data.changeLogs} />
    </AdminPageChrome>
  );
}
