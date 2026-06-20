"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useState } from "react";
import { Building2, Home, Menu, X } from "lucide-react";
import Link from "next/link";
import type { AptProfileDto } from "@/actions/apt";
import { setHomePublic } from "@/actions/apt-world";
import type { BondeeHomeState } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { AptSceneErrorBoundary } from "@/components/apt/apt-scene-error-boundary";
import type { AptStudioInventoryItem } from "@/studio/lib/apt-types";
import { cn } from "@/lib/utils";

const AptBuildingView = dynamic(
  () => import("@/components/apt/apt-building-view").then((m) => m.AptBuildingView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
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
      <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
        내 집 불러오는 중…
      </div>
    ),
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
  const [tab, setTab] = useState<"home" | "tower">("home");
  const [towerMounted, setTowerMounted] = useState(false);
  const [homeState, setHomeState] = useState(bondeeHome);
  const [homeRooms, setHomeRooms] = useState(initialHomeRooms);
  const [doorOpen, setDoorOpen] = useState(initialProfile?.homePublic ?? true);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="relative h-full w-full overflow-hidden">
      {/* 3D world — full viewport */}
      <AptSceneErrorBoundary>
        <div className={cn("absolute inset-0", tab !== "home" && "invisible pointer-events-none")}>
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
                내 집 불러오는 중…
              </div>
            }
          >
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
          </Suspense>
        </div>
        <div className={cn("absolute inset-0", tab !== "tower" && "invisible pointer-events-none")}>
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
            <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
              1000층 타워 불러오는 중…
            </div>
          )}
        </div>
      </AptSceneErrorBoundary>

      {/* Minimal floating HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-black/45 text-white backdrop-blur-md shadow-lg transition hover:bg-black/60"
            aria-label="메뉴"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {menuOpen && (
            <div className="animate-in fade-in slide-in-from-left-2 rounded-xl border border-white/15 bg-black/70 px-3 py-2 text-xs text-white/90 backdrop-blur-md shadow-xl space-y-1 min-w-[10rem]">
              <Link href="/" className="block font-bold text-white hover:text-pink-200">
                MoCoMo 홈
              </Link>
              {isLoggedIn && initialProfile?.regionLabel && (
                <p className="text-white/60">
                  📍 {initialProfile.regionLabel} · {initialProfile.homeFloor}층
                </p>
              )}
              {!isLoggedIn && <p className="text-white/60">로그인 후 입주하세요</p>}
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex gap-1.5 rounded-2xl border border-white/15 bg-black/45 p-1 backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={() => setTab("home")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
              tab === "home"
                ? "bg-pink-500/90 text-white shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">내 집</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("tower")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
              tab === "tower"
                ? "bg-sky-500/90 text-white shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">타워</span>
          </button>
        </div>
      </div>
    </div>
  );
}
