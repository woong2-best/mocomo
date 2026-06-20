"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AptProfileDto } from "@/actions/apt";
import { setHomePublic } from "@/actions/apt-world";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/building-scene";
import type { BondeeHomeState } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { AptSceneErrorBoundary } from "@/components/apt/apt-scene-error-boundary";
import type { AptStudioInventoryItem } from "@/studio/lib/apt-types";
import {
  APT_FADE_HOLD_MS,
  APT_FADE_IN_MS,
  APT_FADE_OUT_MS,
  type AptHomeTransitionPhase,
} from "@/components/apt/apt-home-transition";

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
  const homeFloor = initialProfile?.homeFloor ?? APT_DEFAULT_FLOOR;
  const [insideHome, setInsideHome] = useState(isLoggedIn);
  const [transitionPhase, setTransitionPhase] = useState<AptHomeTransitionPhase>(null);
  const userExitedAtHomeRef = useRef(false);
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

  const runEnterHome = useCallback(() => {
    setTransitionPhase("enter-out");
    window.setTimeout(() => {
      setInsideHome(true);
      setTransitionPhase("enter-in");
      window.setTimeout(() => {
        setTransitionPhase(null);
        userExitedAtHomeRef.current = false;
      }, APT_FADE_IN_MS);
    }, APT_FADE_OUT_MS + APT_FADE_HOLD_MS);
  }, []);

  const runExitHome = useCallback(() => {
    setTransitionPhase("exit-out");
    window.setTimeout(() => {
      setInsideHome(false);
      setTransitionPhase("exit-in");
      window.setTimeout(() => {
        setTransitionPhase(null);
        userExitedAtHomeRef.current = true;
      }, APT_FADE_IN_MS);
    }, APT_FADE_OUT_MS + APT_FADE_HOLD_MS);
  }, []);

  const instantExitHome = useCallback(() => {
    setInsideHome(false);
  }, []);

  /** 다른 층으로 이동할 때 — 즉시 타워 뷰 */
  const handleFloorChange = useCallback(
    (floor: number) => {
      if (floor !== homeFloor) {
        userExitedAtHomeRef.current = false;
        instantExitHome();
      }
    },
    [homeFloor, instantExitHome]
  );

  /** 엘리베이터로 내 집층 도착 — 자동으로 집 안으로 */
  const handleArriveHomeFloor = useCallback(() => {
    if (!isLoggedIn || userExitedAtHomeRef.current) return;
    runEnterHome();
  }, [isLoggedIn, runEnterHome]);

  /** 집 안 엘리베이터 → 타워에서 층 선택 */
  const handleElevatorFromHome = useCallback(() => {
    runExitHome();
  }, [runExitHome]);

  return (
    <div className="w-full max-w-none px-3 sm:px-5 lg:px-8 py-4 lg:py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-folk-cobalt">APT</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {isLoggedIn
            ? `${homeFloor}층이 내 집입니다. 집 안에서 꾸미고, 엘리베이터로 1000층 타워를 오갈 수 있습니다.`
            : "로그인 후 가입 국가 아파트에 입주하세요."}
        </p>
        {isLoggedIn && initialProfile?.regionLabel && (
          <div className="inline-flex items-center gap-2 rounded-full border border-folk-terracotta/25 bg-folk-terracotta/8 px-3 py-1 text-xs font-semibold text-folk-terracotta">
            <span>📍 {initialProfile.regionLabel}</span>
            <span className="text-folk-terracotta/40">·</span>
            <span>{homeFloor}층 입주</span>
          </div>
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
          homeFloor={homeFloor}
          insideHome={insideHome}
          transitionPhase={transitionPhase}
          onEnterHome={runEnterHome}
          onExitHome={runExitHome}
          onFloorChange={handleFloorChange}
          onArriveHomeFloor={handleArriveHomeFloor}
          interiorOverlay={
            isLoggedIn ? (
              <AptBondeeRoom
                embedded
                initialState={homeState}
                rooms={homeRooms}
                isLoggedIn={isLoggedIn}
                studioInventory={studioInventory}
                onHomeChange={setHomeState}
                paused={!insideHome}
                doorOpen={doorOpen}
                onDoorToggle={() => void toggleDoor()}
                onElevatorUse={handleElevatorFromHome}
              />
            ) : null
          }
        />
      </AptSceneErrorBoundary>
    </div>
  );
}
