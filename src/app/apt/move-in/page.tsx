import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { getAptProfile } from "@/actions/apt";
import { AptMoveInClient } from "@/components/apt/apt-move-in-client";

export const metadata = {
  title: "APT 입주 안내 | MoCoMo",
  description: "MoCoMo APT 입주 및 생활 시뮬레이션 안내",
};

export default async function AptMoveInPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/apt/move-in");

  const profile = await getAptProfile();
  if (profile?.moveInCompleted) {
    redirect(profile.housingType === "house" ? "/apt/house" : "/apt");
  }

  return (
    <AptMoveInClient
      username={user.name ?? user.username}
      countryCode={user.countryCode ?? "KR"}
    />
  );
}
