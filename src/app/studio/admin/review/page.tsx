import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { isOperatorIdentity } from "@/lib/operator-config";
import { getReviewQueue } from "@/studio/actions/review";
import { ReviewQueueClient } from "@/studio/components/review-queue";

export default async function StudioAdminReviewPage() {
  const user = await requireAuth();
  if (!isOperatorIdentity({ username: user.username ?? "", role: user.role ?? "USER" })) {
    redirect("/studio");
  }

  const items = await getReviewQueue();
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold">자산 검수</h1>
      <ReviewQueueClient items={items} />
    </div>
  );
}
