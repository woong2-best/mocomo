"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

const AptBuildingView = dynamic(
  () => import("@/components/apt/apt-building-view").then((m) => m.AptBuildingView),
  { ssr: false, loading: () => null }
);

const AptBondeeRoom = dynamic(
  () => import("@/components/apt/apt-bondee-room").then((m) => m.AptBondeeRoom),
  {
    ssr: false,
    loading: () => (
      <div className="folk-card flex min-h-[min(80dvh,820px)] items-center justify-center text-sm text-muted-foreground bg-[#fef6f8]">
        내 집 불러오는 중…
      </div>
    ),
  }
);

/** home = 내 집 실내(베이스) · tower = 1000층 이동(엘리베이터 탈 때만) */
type AptViewMode = "home" | "tower";

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
  const [viewMode, setViewMode] = useState<AptViewMode>(isLoggedIn ? "home" : "tower");
  const [towerMounted, setTowerMounted] = useState(!isLoggedIn);
  const [transitionPhase, setTransitionPhase] = useState<AptHomeTransitionPhase>(null);
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

  /** 집 → 타워 (엘리베이터 탑승) */
  const switchToTower = useCallback(() => {
    setTowerMounted(true);
    setTransitionPhase("exit-out");
    window.setTimeout(() => {
      setViewMode("tower");
      setTransitionPhase("exit-in");
      window.setTimeout(() => setTransitionPhase(null), APT_FADE_IN_MS);
    }, APT_FADE_OUT_MS + APT_FADE_HOLD_MS);
  }, []);

  /** 타워 → 집 (내 집층 도착 또는 내 집으로 버튼) */
  const switchToHome = useCallback(() => {
    setTransitionPhase("enter-out");
    window.setTimeout(() => {
      setViewMode("home");
      setTransitionPhase("enter-in");
      window.setTimeout(() => setTransitionPhase(null), APT_FADE_IN_MS);
    }, APT_FADE_OUT_MS + APT_FADE_HOLD_MS);
  }, []);

  const transitioning = transitionPhase !== null;

  return (
    <div className="w-full max-w-none px-3 sm:px-5 lg:px-8 py-4 lg:py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-folk-cobalt">APT</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {isLoggedIn
            ? viewMode === "home"
              ? `${homeFloor}층 · 내 집에서 아바타와 가구를 꾸미세요. 복도 끝 엘리베이터로 다른 층을 방문할 수 있습니다.`
              : `1000층 타워 · ${homeFloor}층에서 다른 층으로 이동 중입니다.`
            : "로그인 후 가입 국가 아파트에 입주하세요."}
        </p>
        {isLoggedIn && initialProfile?.regionLabel && viewMode === "home" && (
          <div className="inline-flex items-center gap-2 rounded-full border border-folk-terracotta/25 bg-folk-terracotta/8 px-3 py-1 text-xs font-semibold text-folk-terracotta">
            <span>📍 {initialProfile.regionLabel}</span>
            <span className="opacity-40">·</span>
            <span>{homeFloor}층</span>
          </div>
        )}
      </div>

      <AptSceneErrorBoundary>
        <div className="relative">
          {/* 동물의숲 검은 페이드 */}
          {transitionPhase && (
            <div
              className={cn(
                "apt-black-curtain absolute inset-0 z-[60] pointer-events-auto rounded-[inherit]",
                transitionPhase === "enter-out" || transitionPhase === "exit-out"
                  ? "apt-fade-to-black"
                  : "apt-fade-from-black"
              )}
              aria-hidden
            />
          )}

          {/* ■ 베이스: 내 집 (처음 접속 = 이것만) */}
          {isLoggedIn && (
            <div className={cn(viewMode !== "home" && "hidden")}>
              <AptBondeeRoom
                initialState={homeState}
                rooms={homeRooms}
                isLoggedIn={isLoggedIn}
                studioInventory={studioInventory}
                onHomeChange={setHomeState}
                paused={viewMode !== "home" || transitioning}
                doorOpen={doorOpen}
                onDoorToggle={() => void toggleDoor()}
                onElevatorUse={switchToTower}
              />
            </div>
          )}

          {/* ■ 부가: 1000층 타워 (엘리베이터 탈 때만) */}
          {towerMounted && (
            <div className={cn(viewMode !== "tower" && "hidden")}>
              <AptBuildingView
                initialProfile={initialProfile}
                bondeeRoom={homeState}
                isLoggedIn={isLoggedIn}
                onHomeRoomsChange={setHomeRooms}
                doorOpen={doorOpen}
                onDoorToggle={() => void toggleDoor()}
                homeFloor={homeFloor}
                paused={viewMode !== "tower" || transitioning}
                onReturnHome={switchToHome}
                onArriveHomeFloor={switchToHome}
              />
            </div>
          )}

          {/* 비로그인: 타워만 */}
          {!isLoggedIn && (
            <AptBuildingView
              initialProfile={initialProfile}
              bondeeRoom={homeState}
              isLoggedIn={false}
              homeFloor={homeFloor}
            />
          )}
        </div>
      </AptSceneErrorBoundary>
    </div>
  );
}
