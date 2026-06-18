import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { getAptProfile } from "@/actions/apt";
import { AptHubClient } from "@/components/apt/apt-hub-client";

export const metadata = {
  title: "APT | MoCoMo",
  description: "MoCoMo APT — 3D 아파트 생활 시뮬레이션",
};

export const dynamic = "force-dynamic";

export default async function AptPage() {
  try {
    const user = await getCachedCurrentUser();
    const profile = user ? await getAptProfile() : null;

    if (user && profile && !profile.moveInCompleted) {
      redirect("/apt/move-in");
    }

    return <AptHubClient initialProfile={profile} isLoggedIn={!!user} />;
  } catch (e) {
    console.error("[AptPage]", e);
    return <AptHubClient initialProfile={null} isLoggedIn={false} />;
  }
}
