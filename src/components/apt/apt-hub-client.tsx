"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { AptProfileDto } from "@/actions/apt";
import { setHomePublic } from "@/actions/apt-world";
import type { BondeeHomeState } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { AptSceneErrorBoundary } from "@/components/apt/apt-scene-error-boundary";
import type { AptStudioInventoryItem } from "@/studio/lib/apt-types";

const AptBuildingView = dynamic(
  () => import("@/components/apt/apt-building-view").then((m) => m.AptBuildingView),
  {
    ssr: false,
    loading: () => (
      <div className="folk-card flex min-h-[min(88dvh,920px)] items-center justify-center text-sm text-muted-foreground bg-[#fef6f8]">
        아파트 불러오는 중…
      </div>
    ),
  }
);

const AptBondeeRoom = dynamic(
  () => import("@/components/apt/apt-bondee-room").then((m) => m.AptBondeeRoom),
  {
    ssr: false,
    loading: () => null,
  }
);

export function AptHubClient({
  initialProfile,
  bondeeHome,
  homeRooms: initialHomeRooms,
  isLoggedIn,
  studioInventory = [],
}: {
  initialProfile: AptProfileDto | null;
  bondeeHome: BondeeHomeState;
  homeRooms: AptRoom[];
  isLoggedIn: boolean;
  studioInventory?: AptStudioInventoryItem[];
}) {
  const [sceneMode, setSceneMode] = useState<"building" | "interior">("building");
  const [interiorMounted, setInteriorMounted] = useState(false);
  const [homeState, setHomeState] = useState(bondeeHome);
  const [homeRooms, setHomeRooms] = useState(initialHomeRooms);
  const [doorOpen, setDoorOpen] = useState(initialProfile?.homePublic ?? true);

  const toggleDoor = useCallback(async () => {
    const next = !doorOpen;
    setDoorOpen(next);
    await setHomePublic(next);
  }, [doorOpen]);

  useEffect(() => {
    if (initialProfile) setDoorOpen(initialProfile.homePublic);
  }, [initialProfile?.homePublic]);

  const enterInterior = useCallback(() => {
    setInteriorMounted(true);
    setSceneMode("interior");
  }, []);

  const exitInterior = useCallback(() => {
    setSceneMode("building");
  }, []);

  const useElevator = useCallback(() => {
    setSceneMode("building");
  }, []);

  return (
    <div className="w-full max-w-none px-3 sm:px-5 lg:px-8 py-4 lg:py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-folk-cobalt">APT</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isLoggedIn
            ? "1000층 타워에서 층을 이동하고, 실내에서 아바타·가구를 꾸미며, 복도 끝 엘리베이터로 타워 전체를 오갈 수 있습니다."
            : "로그인 후 가입 국가 아파트에 입주하세요."}
        </p>
        {isLoggedIn && initialProfile?.regionLabel && (
          <p className="text-xs text-folk-terracotta font-medium flex items-center gap-1">
            📍 {initialProfile.regionLabel}
            {` · ${initialProfile.homeFloor}층 · 주방·거실·화장실·침실`}
          </p>
        )}
      </div>

      <AptSceneErrorBoundary>
        <AptBuildingView
          initialProfile={initialProfile}
          bondeeRoom={homeState}
          isLoggedIn={isLoggedIn}
          onHomeRoomsChange={setHomeRooms}
          doorOpen={doorOpen}
          onDoorToggle={() => void toggleDoor()}
          sceneMode={sceneMode}
          onSceneModeChange={setSceneMode}
          interiorActive={sceneMode === "interior"}
          onEnterInterior={enterInterior}
          onExitInterior={exitInterior}
          interiorOverlay={
            interiorMounted ? (
              <AptBondeeRoom
                embedded
                initialState={homeState}
                rooms={homeRooms}
                isLoggedIn={isLoggedIn}
                studioInventory={studioInventory}
                onHomeChange={setHomeState}
                paused={sceneMode !== "interior"}
                doorOpen={doorOpen}
                onDoorToggle={() => void toggleDoor()}
                onElevatorUse={useElevator}
              />
            ) : null
          }
        />
      </AptSceneErrorBoundary>
    </div>
  );
}
