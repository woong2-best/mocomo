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
  if (!user?.id) redirect("/auth/signin?callbackUrl=/market/my");

  const { lane } = await searchParams;
  const initialLane: UsedHubLane =
    lane === "purchased" || lane === "selling" || lane === "favorites" || lane === "disputes"
      ? lane
      : "selling";

  return <UsedMyHub key={initialLane} userId={user.id} initialLane={initialLane} />;
}
