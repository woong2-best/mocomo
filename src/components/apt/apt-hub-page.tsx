import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth";
import { isAptPublicEnabled } from "@/lib/apt-public-gate";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { getAptProfile } from "@/actions/apt";
import { bondeeFromAptProfile } from "@/lib/apt/bondee/bondee-profile";
import { getAptStudioInventory } from "@/studio/actions/library";
import { DEFAULT_BONDEE_HOME } from "@/lib/apt/bondee/types";
import { createDefaultFloorPlan } from "@/lib/apt/floor-plan-logic";
import { AptHubClient } from "@/components/apt/apt-hub-client";
import { getAptGameState } from "@/actions/apt-game";
import { getAptEconomySnapshot } from "@/actions/apt-economy";
import type { AptGameState } from "@/lib/apt/game/types";
import type { EconomySnapshot } from "@/lib/apt/economy/types";

export const aptHubMetadata = {
  title: "내 집 | MoCoMo",
  description: "MoCoMo — 치비 아바타 내 집 & 다이오라마",
};

export async function AptHubPage() {
  if (!isAptPublicEnabled()) {
    redirect(DEFAULT_LANDING_PATH);
  }

  let user = null;
  let profile = null;
  let studioInventory: Awaited<ReturnType<typeof getAptStudioInventory>> = [];
  let gameState: AptGameState | null = null;
  let economySnapshot: EconomySnapshot | null = null;
  let gameLoadError = false;

  try {
    user = await getCachedCurrentUser();
    if (user) {
      const [gameResult, nextProfile, nextInventory, nextEconomy] = await Promise.all([
        getAptGameState().then(
          (state) => ({ state, error: false as const }),
          (e) => {
            console.error("[AptHubPage] game state", e);
            return { state: null, error: true as const };
          }
        ),
        getAptProfile().catch(() => null),
        getAptStudioInventory().catch(() => []),
        getAptEconomySnapshot().catch(() => null),
      ]);
      gameLoadError = gameResult.error;
      gameState = gameResult.state;
      profile = nextProfile;
      studioInventory = nextInventory;
      economySnapshot = nextEconomy;
    }
  } catch (e) {
    console.error("[AptHubPage]", e);
  }

  let bondeeHome = DEFAULT_BONDEE_HOME;
  let homeRooms = createDefaultFloorPlan().rooms;
  try {
    if (user && profile) {
      const parsed = bondeeFromAptProfile(profile);
      bondeeHome = parsed.home;
      homeRooms = parsed.rooms;
    }
  } catch (e) {
    console.error("[AptHubPage] bondee parse", e);
  }

  return (
    <AptHubClient
      initialProfile={profile}
      bondeeHome={bondeeHome}
      homeRooms={homeRooms}
      isLoggedIn={!!user}
      studioInventory={studioInventory}
      currentUserId={user?.id ?? null}
      initialGameState={gameState}
      initialEconomy={economySnapshot}
      gameLoadError={gameLoadError}
      userAvatarUrl={user?.image ?? null}
      userName={user?.name ?? null}
    />
  );
}
