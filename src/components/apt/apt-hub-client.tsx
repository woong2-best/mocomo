"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Building2, Home, Menu, X } from "lucide-react";
import Link from "next/link";
import type { AptProfileDto } from "@/actions/apt";
import { setHomePublic } from "@/actions/apt-world";
import type { BondeeHomeState } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { AptSceneErrorBoundary } from "@/components/apt/apt-scene-error-boundary";
import type { AptStudioInventoryItem } from "@/studio/lib/apt-types";
import { cn } from "@/lib/utils";
import { UnifiedAptWorldScene } from "@/lib/apt/world/unified-apt-world-scene";
import type { AptWorldMode } from "@/lib/apt/world/world-types";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/constants";
import { AptInteractPrompt } from "@/components/apt/apt-interact-prompt";
import { HomeAvatarControls } from "@/components/apt/home-avatar-controls";

const AptBuildingView = dynamic(
  () => import("@/components/apt/apt-building-view").then((m) => m.AptBuildingView),
  { ssr: false }
);

const AptBondeeRoom = dynamic(
  () => import("@/components/apt/apt-bondee-room").then((m) => m.AptBondeeRoom),
  { ssr: false }
);

export function AptHubClient({
  initialProfile,
  bondeeHome,
  homeRooms: initialHomeRooms,
  isLoggedIn,
  studioInventory = [],
  currentUserId = null,
}: {
  initialProfile: AptProfileDto | null;
  bondeeHome: BondeeHomeState;
  homeRooms: AptRoom[];
  isLoggedIn: boolean;
  studioInventory?: AptStudioInventoryItem[];
  currentUserId?: string | null;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<UnifiedAptWorldScene | null>(null);
  const [worldMode, setWorldMode] = useState<AptWorldMode>("district");
  const [homeState, setHomeState] = useState(bondeeHome);
  const [homeRooms, setHomeRooms] = useState(initialHomeRooms);
  const [doorOpen, setDoorOpen] = useState(initialProfile?.homePublic ?? true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [nearHomeDoor, setNearHomeDoor] = useState(false);
  const [visitToast, setVisitToast] = useState<string | null>(null);
  const [avatarMode, setAvatarMode] = useState<"chibi" | "vrm" | null>(null);
  const [nearElevator, setNearElevator] = useState(false);
  const [nearLobbyStairs, setNearLobbyStairs] = useState(false);
  const [isVisiting, setIsVisiting] = useState(false);
  const homeFloor = initialProfile?.homeFloor ?? APT_DEFAULT_FLOOR;

  const toggleDoor = useCallback(async () => {
    const next = !doorOpen;
    setDoorOpen(next);
    worldRef.current?.setDoorOpen(next);
    await setHomePublic(next);
  }, [doorOpen]);

  useEffect(() => {
    if (initialProfile) setDoorOpen(initialProfile.homePublic);
  }, [initialProfile?.homePublic]);

  useEffect(() => {
    worldRef.current?.setDoorOpen(doorOpen);
  }, [doorOpen]);

  useEffect(() => {
    worldRef.current?.updateHomeState(homeState);
  }, [homeState]);

  useEffect(() => {
    worldRef.current?.updateHomeRooms(homeRooms);
  }, [homeRooms]);

  useEffect(() => {
    const inCorr = worldMode === "corridor";
    const inLob = worldMode === "lobby";
    if (!inCorr && !inLob) {
      setAvatarMode(null);
      return;
    }
    const id = window.setInterval(() => {
      const walk = inCorr ? worldRef.current?.getCorridorWalk() : worldRef.current?.getLobbyWalk();
      setAvatarMode(walk?.avatar.getMode() ?? null);
      if (inCorr) {
        setNearElevator(worldRef.current?.getCorridorWalk()?.getNearElevator() ?? false);
      }
      if (inLob) {
        setNearLobbyStairs(worldRef.current?.getLobbyWalk()?.getNearStairs() ?? false);
      }
      setIsVisiting(worldRef.current?.isVisiting() ?? false);
    }, 400);
    return () => window.clearInterval(id);
  }, [worldMode]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const world = new UnifiedAptWorldScene(el, {
      homeFloor,
      rooms: homeRooms,
      homeState,
      doorOpen,
      userId: currentUserId,
    });

    world.setCallbacks({
      onModeChange: setWorldMode,
      onNearHomeDoor: (canEnter) => setNearHomeDoor(canEnter),
      onVisitMessage: (msg) => {
        setVisitToast(msg);
        window.setTimeout(() => setVisitToast(null), 2800);
      },
    });

    worldRef.current = world;

    return () => {
      world.dispose();
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inInterior = worldMode === "interior";
  const inCorridor = worldMode === "corridor";
  const inLobby = worldMode === "lobby";
  const inWorld = worldMode === "district" || worldMode === "tower" || worldMode === "elevator";

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 3D canvas — 최하단 */}
      <div ref={mountRef} className="absolute inset-0 z-0" />

      {/* 타워/집 UI 오버레이 — 클릭 통과 */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <AptSceneErrorBoundary>
          <Suspense fallback={null}>
            <AptBuildingView
              initialProfile={initialProfile}
              bondeeRoom={homeState}
              isLoggedIn={isLoggedIn}
              onHomeRoomsChange={setHomeRooms}
              paused={!inWorld && !inCorridor && !inLobby}
              doorOpen={doorOpen}
              onDoorToggle={() => void toggleDoor()}
              unifiedWorldRef={worldRef}
              skipSceneMount
              worldMode={worldMode}
            />
            <AptBondeeRoom
              initialState={homeState}
              rooms={homeRooms}
              isLoggedIn={isLoggedIn}
              studioInventory={studioInventory}
              onHomeChange={setHomeState}
              paused={!inInterior}
              doorOpen={doorOpen}
              onDoorToggle={() => void toggleDoor()}
              unifiedWorldRef={worldRef}
              skipSceneMount
              worldMode={worldMode}
            />
          </Suspense>
        </AptSceneErrorBoundary>
      </div>

      {/* 복도 / 로비 조작 UI */}
      <div className="absolute inset-0 z-40 pointer-events-none">
      {inCorridor && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 z-10">
            <AptInteractPrompt
              label={
                nearHomeDoor
                  ? "현관문 입장 (E)"
                  : nearElevator
                    ? "엘리베이터 (E)"
                    : "복도 · F 상호작용"
              }
              visible={nearHomeDoor || nearElevator}
            />
          </div>
          <div className="absolute left-3 bottom-3 pointer-events-auto z-10 flex flex-col gap-2">
            <HomeAvatarControls
              onMove={(x, z) => worldRef.current?.getCorridorWalk()?.setMoveInput(x, z)}
              onInteract={() => {
                if (nearHomeDoor) worldRef.current?.tryEnterHome();
                else if (nearElevator) worldRef.current?.corridorUseElevator();
                else worldRef.current?.knockOrBell();
              }}
              canInteract
              interactLabel={
                nearHomeDoor
                  ? "현관문 입장 (E)"
                  : nearElevator
                    ? "엘리베이터 (E)"
                    : isVisiting
                      ? "노크/벨 (E)"
                      : "노크 (E)"
              }
            />
            <button
              type="button"
              onClick={() => worldRef.current?.interactCorridorProp()}
              className="rounded-xl border border-white/20 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white/80 backdrop-blur-md"
            >
              CCTV · 안내판 (F)
            </button>
            {isVisiting && (
              <button
                type="button"
                onClick={() => worldRef.current?.exitVisit()}
                className="rounded-xl border border-pink-400/40 bg-pink-500/20 px-3 py-2 text-xs font-bold text-pink-100 backdrop-blur-md"
              >
                방문 종료
              </button>
            )}
          </div>
        </>
      )}

      {/* 로비 — 보행·엘리베이터·계단 */}
      {inLobby && (
        <div className="absolute left-3 bottom-3 pointer-events-auto z-10 flex flex-col gap-2">
          {nearLobbyStairs && (
            <div className="pointer-events-none rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-bold text-emerald-100 backdrop-blur-md">
              계단 근처 — 아래 버튼으로 이용
            </div>
          )}
          <HomeAvatarControls
            onMove={(x, z) => worldRef.current?.getLobbyWalk()?.setMoveInput(x, z)}
            onInteract={() => worldRef.current?.lobbyUseElevator()}
            canInteract
            interactLabel="엘리베이터 (E)"
          />
          <button
            type="button"
            onClick={() => worldRef.current?.lobbyUseStairs()}
            className="rounded-xl border border-white/20 bg-black/50 px-3 py-2 text-xs font-bold text-white/90 backdrop-blur-md"
          >
            계단 이용
          </button>
        </div>
      )}

      {visitToast && (
        <div className="pointer-events-none absolute top-28 left-1/2 -translate-x-1/2 z-[60] rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
          {visitToast}
        </div>
      )}
      </div>

      {/* 상단 네비 HUD — 항상 최상단 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between p-3 sm:p-4">
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
            onClick={() => worldRef.current?.showDistrict()}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
              worldMode === "district"
                ? "bg-violet-500/90 text-white shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">단지</span>
          </button>
          <button
            type="button"
            onClick={() => worldRef.current?.showTower()}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
              inWorld && worldMode !== "district"
                ? "bg-sky-500/90 text-white shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">타워</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              worldRef.current?.showLobby();
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
              inLobby
                ? "bg-emerald-500/90 text-white shadow-md"
                : "text-white/70 hover:text-white hover:bg-white/10"
            )}
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">로비</span>
          </button>
          {isLoggedIn && (
            <button
              type="button"
              onClick={() => worldRef.current?.goToMyHome()}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
                inInterior || inCorridor
                  ? "bg-pink-500/90 text-white shadow-md"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              )}
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">내 집</span>
            </button>
          )}
          {inInterior && (
            <button
              type="button"
              onClick={() => worldRef.current?.exitToCorridor()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10"
            >
              나가기
            </button>
          )}
          {inInterior && isVisiting && (
            <button
              type="button"
              onClick={() => worldRef.current?.exitVisit()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-pink-200 hover:bg-pink-500/20"
            >
              방문 종료
            </button>
          )}
        </div>
      </div>

      {/* 모드 안내 */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-50 rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-[10px] font-semibold text-white/70 backdrop-blur-md">
        {worldMode === "district" && "1000층 단지 · 층을 클릭하면 복도로 진입"}
        {worldMode === "lobby" && `로비 · ${avatarMode === "vrm" ? "VRM 아바타" : "주차장·우편함·엘리베이터"}`}
        {worldMode === "tower" && "층별 단면 · 엘리베이터로 이동"}
        {worldMode === "elevator" && "엘리베이터 이동 중…"}
        {worldMode === "corridor" && `복도 · ${avatarMode === "vrm" ? "VRM" : "노크/벨 · EV · 입장"}`}
        {worldMode === "interior" && (isVisiting ? "이웃 집 · 가구와 상호작용" : "내 집 · 가구와 상호작용")}
      </div>
    </div>
  );
}
