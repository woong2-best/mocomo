import { getCachedCurrentUser } from "@/lib/auth";
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

export const metadata = {
  title: "APT | MoCoMo",
  description: "MoCoMo APT — 치비 아바타 내 집 & 1000층 타워",
};

export const dynamic = "force-dynamic";

// 서버 리다이렉트 없이 항상 진입 화면을 렌더한다.
// 로그인/입주 여부에 따른 이동은 모두 클라이언트 버튼에서 처리한다.
export default async function AptPage() {
  let user = null;
  let profile = null;
  let studioInventory: Awaited<ReturnType<typeof getAptStudioInventory>> = [];
  let gameState: AptGameState | null = null;
  let economySnapshot: EconomySnapshot | null = null;

  try {
    user = await getCachedCurrentUser();
    if (user) {
      [profile, studioInventory, gameState, economySnapshot] = await Promise.all([
        getAptProfile().catch(() => null),
        getAptStudioInventory().catch(() => []),
        getAptGameState().catch(() => null),
        getAptEconomySnapshot().catch(() => null),
      ]);
    }
  } catch (e) {
    console.error("[AptPage]", e);
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
    console.error("[AptPage] bondee parse", e);
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
      userLevel={user?.level ?? 1}
      userAvatarUrl={user?.image ?? null}
      userName={user?.name ?? null}
    />
  );
}
