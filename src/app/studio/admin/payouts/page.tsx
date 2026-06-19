import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isOperatorIdentity } from "@/lib/operator-config";
import { getPendingStudioPayouts } from "@/studio/actions/wallet";
import { AdminPayoutsClient } from "@/studio/components/admin-payouts";

export default async function StudioAdminPayoutsPage() {
  const user = await requireAuth();
  if (!isOperatorIdentity({ username: user.username ?? "", role: user.role ?? "USER" })) {
    redirect("/studio");
  }

  const payouts = await getPendingStudioPayouts();
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">Studio 출금 관리</h1>
      <AdminPayoutsClient payouts={payouts} />
    </div>
  );
}
