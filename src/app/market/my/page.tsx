import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedMyHub } from "@/components/used/used-my-hub";
import type { UsedHubLane } from "@/actions/used-market";

export default async function UsedMyPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string }>;
}) {
  const user = await getCachedCurrentUser();
  const { lane } = await searchParams;
  const callbackPath =
    lane && lane.length < 32 ? `/market/my?lane=${encodeURIComponent(lane)}` : "/market/my";
  if (!user?.id) redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);

  const initialLane: UsedHubLane =
    lane === "purchased" ||
    lane === "selling" ||
    lane === "my-bids" ||
    lane === "favorites" ||
    lane === "disputes"
      ? lane
      : "selling";

  return <UsedMyHub key={initialLane} userId={user.id} initialLane={initialLane} />;
}
