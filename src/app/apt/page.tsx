import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { getAptProfile } from "@/actions/apt";
import { bondeeFromAptProfile } from "@/lib/apt/bondee/bondee-profile";
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
    const [profile, studioInventory] = await Promise.all([
      user ? getAptProfile() : Promise.resolve(null),
      user ? getAptStudioInventory().catch(() => []) : Promise.resolve([]),
    ]);

    if (user && !profile?.moveInCompleted) {
      redirect("/apt/move-in");
    }

    const { home: bondeeHome, rooms: homeRooms } = user
      ? bondeeFromAptProfile(profile)
      : { home: DEFAULT_BONDEE_HOME, rooms: createDefaultFloorPlan().rooms };

    return (
      <AptHubClient
        initialProfile={profile}
        bondeeHome={bondeeHome}
        homeRooms={homeRooms}
        isLoggedIn={!!user}
        studioInventory={studioInventory}
        currentUserId={user?.id ?? null}
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
