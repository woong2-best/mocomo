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
  let user = null;
  let profile = null;
  let studioInventory: Awaited<ReturnType<typeof getAptStudioInventory>> = [];

  try {
    user = await getCachedCurrentUser();
    if (user) {
      [profile, studioInventory] = await Promise.all([
        getAptProfile(),
        getAptStudioInventory().catch(() => []),
      ]);
    }
  } catch (e) {
    console.error("[AptPage]", e);
  }

  // redirect()는 NEXT_REDIRECT 예외를 던지므로 반드시 try/catch 밖에서 호출.
  if (user && !profile?.moveInCompleted) {
    redirect("/apt/move-in");
  }

  const { home: bondeeHome, rooms: homeRooms } =
    user && profile
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
}
