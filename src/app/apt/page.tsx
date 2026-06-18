import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { getAptProfile } from "@/actions/apt";
import { AptHubClient } from "@/components/apt/apt-hub-client";

export const metadata = {
  title: "APT | MoCoMo",
  description: "MoCoMo APT — 3D 아파트 생활 시뮬레이션",
};

export default async function AptPage() {
  const user = await getCachedCurrentUser();
  if (user) {
    const profile = await getAptProfile();
    if (profile && !profile.moveInCompleted) {
      redirect("/apt/move-in");
    }
  }

  const profile = user ? await getAptProfile() : null;
  return <AptHubClient initialProfile={profile} isLoggedIn={!!user} />;
}
