import { requireAdminPermission } from "@/lib/admin/access";
import { ManualPayoutQueue } from "@/components/admin/manual-payout-queue";
import { listCreatorPayoutAdminQueue } from "@/lib/creator-payout/admin";

export const dynamic = "force-dynamic";

export default async function AdminManualPayoutsPage() {
  try {
    await requireAdminPermission("settlements", {
      action: "PAYOUT_PROCESS",
      targetType: "creator_payout_queue",
      targetId: "pending",
    });
  } catch {
    return <p className="text-sm text-destructive">You do not have access to payouts.</p>;
  }
  const data = await listCreatorPayoutAdminQueue();
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manual creator payouts</h1>
        <p className="text-sm text-muted-foreground">
          Verify tax forms, send the payout from Payoneer, Wise, or the company bank, then mark it completed.
          Stripe Connect is not used for these rewards.
        </p>
      </div>
      <ManualPayoutQueue requests={data.requests} taxReviews={data.taxReviews} />
    </div>
  );
}
