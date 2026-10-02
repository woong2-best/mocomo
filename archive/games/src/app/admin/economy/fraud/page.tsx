import { getFraudAdminPageData } from "@/actions/admin-fraud";
import { AdminFraudPanel } from "@/components/admin/admin-fraud-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { ShieldAlert } from "lucide-react";

export default async function AdminFraudPage() {
  let data: Awaited<ReturnType<typeof getFraudAdminPageData>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getFraudAdminPageData();
  } catch (e) {
    if (isAdminForbiddenError(e)) forbidden = true;
    else loadFailed = true;
  }

  if (forbidden) return <AdminAccessDenied />;
  if (loadFailed || !data) return <AdminLoadError />;

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
