"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { Building2, Home } from "lucide-react";
import type { AptProfileDto } from "@/actions/apt";
import { setHomePublic } from "@/actions/apt-world";
import type { BondeeHomeState } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { AptSceneErrorBoundary } from "@/components/apt/apt-scene-error-boundary";
import { cn } from "@/lib/utils";

const AptBuildingView = dynamic(
  () => import("@/components/apt/apt-building-view").then((m) => m.AptBuildingView),
  {
    ssr: false,
    loading: () => (
      <div className="folk-card flex min-h-[min(88dvh,920px)] items-center justify-center text-sm text-muted-foreground bg-[#fef6f8]">
        1000층 타워 불러오는 중…
      </div>
    ),
  }
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

import type { AptStudioInventoryItem } from "@/studio/lib/apt-types";

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
  const [tab, setTab] = useState<"home" | "tower">("home");
  const [towerMounted, setTowerMounted] = useState(false);
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

  useEffect(() => {
    if (tab === "tower") setTowerMounted(true);
  }, [tab]);

  return (
    <div className="w-full max-w-none px-3 sm:px-5 lg:px-8 py-4 lg:py-6 pb-16 space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-folk-cobalt">APT</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isLoggedIn
            ? "내 집에서 치비 아바타와 가구를 꾸미고, 1000층 타워에서 입구·펜트하우스까지 엘리베이터로 이동하며 다른 집도 방문할 수 있습니다."
            : "로그인 후 가입 국가 아파트에 입주하세요."}
        </p>
        {isLoggedIn && initialProfile?.regionLabel && (
          <p className="text-xs text-folk-terracotta font-medium flex items-center gap-1">
            📍 {initialProfile.regionLabel}
            {` · ${initialProfile.homeFloor}층 · 주방·거실·화장실·침실`}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("home")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-colors",
            tab === "home" ? "border-folk-terracotta bg-folk-terracotta/10 text-folk-terracotta" : "border-neutral-200 bg-white"
          )}
        >
          <Home className="h-4 w-4" />
          내 집
        </button>
        <button
          type="button"
          onClick={() => setTab("tower")}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-colors",
            tab === "tower" ? "border-folk-terracotta bg-folk-terracotta/10 text-folk-terracotta" : "border-neutral-200 bg-white"
          )}
        >
          <Building2 className="h-4 w-4" />
          1000층 타워
        </button>
      </div>

      <AptSceneErrorBoundary>
        <div className={cn(tab !== "home" && "hidden")}>
          <AptBondeeRoom
            initialState={homeState}
            rooms={homeRooms}
            isLoggedIn={isLoggedIn}
            studioInventory={studioInventory}
            onHomeChange={setHomeState}
            paused={tab !== "home"}
            doorOpen={doorOpen}
            onDoorToggle={() => void toggleDoor()}
          />
        </div>
        <div className={cn(tab !== "tower" && "hidden")}>
          {towerMounted ? (
            <AptBuildingView
              initialProfile={initialProfile}
              bondeeRoom={homeState}
              isLoggedIn={isLoggedIn}
              onHomeRoomsChange={setHomeRooms}
              paused={tab !== "tower"}
              doorOpen={doorOpen}
              onDoorToggle={() => void toggleDoor()}
            />
          ) : (
            <div className="folk-card flex min-h-[min(88dvh,920px)] items-center justify-center text-sm text-muted-foreground bg-[#fef6f8]">
              1000층 타워 불러오는 중…
            </div>
          )}
        </div>
      </AptSceneErrorBoundary>
    </div>
  );
}
