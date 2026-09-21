import { getStripeVerifyDashboard } from "@/actions/admin-stripe-verify";
import { AdminStripeVerifyPanel } from "@/components/admin/admin-stripe-verify-panel";
import { AdminPageChrome } from "@/components/admin/admin-page-chrome";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminLoadError } from "@/components/admin/admin-load-error";
import { isAdminForbiddenError } from "@/lib/admin-access";
import { CreditCard } from "lucide-react";
import Link from "next/link";

export default async function AdminStripeVerifyPage() {
  let data: Awaited<ReturnType<typeof getStripeVerifyDashboard>> | null = null;
  let forbidden = false;
  let loadFailed = false;
  try {
    data = await getStripeVerifyDashboard();
  } catch (e) {
    if (isAdminForbiddenError(e)) forbidden = true;
    else loadFailed = true;
  }

  if (forbidden) return <AdminAccessDenied />;
  if (loadFailed || !data) return <AdminLoadError />;

  return (
    <AdminPageChrome
      maxWidth="3xl"
      title={
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Stripe 결제 · 후원 검증
          </h1>
          <p className="text-sm font-normal text-muted-foreground">
            <Link href="/admin/finance" className="hover:underline">
              ← 매출 · 정산
            </Link>
          </p>
        </div>
      }
    >
      <AdminStripeVerifyPanel data={data} />
    </AdminPageChrome>
  );
}
