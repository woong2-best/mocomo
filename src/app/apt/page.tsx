import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { getAptProfile } from "@/actions/apt";
import { getBondeeHome } from "@/actions/apt-bondee";
import { getAptStudioInventory } from "@/studio/actions/library";
import { DEFAULT_BONDEE_HOME } from "@/lib/apt/bondee/types";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import { AptHubClient } from "@/components/apt/apt-hub-client";

export const metadata = {
  title: "APT | MoCoMo",
  description: "MoCoMo APT — 치비 아바타 내 집 & 1000층 타워",
};

export const dynamic = "force-dynamic";

export default async function AptPage() {
  try {
    const user = await getCachedCurrentUser();
    const profile = user ? await getAptProfile() : null;

    if (user && profile && !profile.moveInCompleted) {
      redirect("/apt/move-in");
    }

    const bondee = user ? await getBondeeHome(profile?.homeFloor) : null;
    const studioInventory = user ? await getAptStudioInventory().catch(() => []) : [];

    return (
      <AptHubClient
        initialProfile={profile}
        bondeeHome={bondee?.home ?? DEFAULT_BONDEE_HOME}
        homeRooms={bondee?.rooms ?? createDefaultFloorPlan().rooms}
        isLoggedIn={!!user}
        studioInventory={studioInventory}
      />
    );
  } catch (e) {
    console.error("[AptPage]", e);
    return (
      <AptHubClient
        initialProfile={null}
        bondeeHome={DEFAULT_BONDEE_HOME}
        homeRooms={createDefaultFloorPlan().rooms}
        isLoggedIn={false}
      />
    );
  }
}
