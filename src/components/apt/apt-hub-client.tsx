"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Home, Menu, X } from "lucide-react";
import Link from "next/link";
import type { AptProfileDto } from "@/actions/apt";
import { heartbeatAptPresence } from "@/actions/apt-presence";
import { setHomePublic } from "@/actions/apt-world";
import type { BondeeHomeState } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { AptSceneErrorBoundary } from "@/components/apt/apt-scene-error-boundary";
import type { AptStudioInventoryItem } from "@/studio/lib/apt-types";
import { UnifiedAptWorldScene } from "@/lib/apt/world/unified-apt-world-scene";
import type { AptSocialSnapshot } from "@/lib/apt/world/apt-social-presence";
import type { AptWorldMode } from "@/lib/apt/world/world-types";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/constants";
import { AptInteractPrompt } from "@/components/apt/apt-interact-prompt";
import { HomeAvatarControls } from "@/components/apt/home-avatar-controls";
import { AptDailyLoopPanel } from "@/components/apt/apt-daily-loop-panel";
import { AptVisitFunnelPanel } from "@/components/apt/apt-visit-funnel-panel";
import { AptMyHomeButton } from "@/components/apt/apt-my-home-button";
import type { VisitFunnelState } from "@/lib/apt/world/visit-funnel-types";
import type { AptCommunityFeed } from "@/lib/apt/presence-types";
import { formatIdentityBrief } from "@/lib/apt/home-identity";

const AptBuildingView = dynamic(
  () => import("@/components/apt/apt-building-view").then((m) => m.AptBuildingView),
  {
    ssr: false,
    loading: () => (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <p className="rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs text-white/70 backdrop-blur-md">
          APT 불러오는 중…
        </p>
      </div>
    ),
  }
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
  const [visitingUserId, setVisitingUserId] = useState<string | null>(null);
  const [socialPresence, setSocialPresence] = useState<AptSocialSnapshot | null>(null);
  const [communityFeed, setCommunityFeed] = useState<AptCommunityFeed | null>(null);
  const [visitUserId, setVisitUserId] = useState<string | null>(null);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [feedLoading, setFeedLoading] = useState(true);
  const [dailyOpen, setDailyOpen] = useState(true);
  const [visitFunnel, setVisitFunnel] = useState<VisitFunnelState | null>(null);
  const homeFloor = initialProfile?.homeFloor ?? APT_DEFAULT_FLOOR;
  const homeCountry = initialProfile?.countryCode ?? "KR";

  const showLoginToast = useCallback((action: string) => {
    setVisitToast(`로그인 후 ${action}할 수 있습니다`);
    window.setTimeout(() => setVisitToast(null), 2800);
  }, []);

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
    if (visitFunnel) setDailyOpen(false);
  }, [visitFunnel]);

  useEffect(() => {
    const inCorr = worldMode === "corridor";
    const inLob = worldMode === "lobby";
    const inInt = worldMode === "interior";
    if (!inCorr && !inLob && !inInt) {
      setAvatarMode(null);
      return;
    }
    const id = window.setInterval(() => {
      const world = worldRef.current;
      if (world) {
        setIsVisiting(world.isVisiting());
        setVisitingUserId(
          world.isVisiting() ? (world.getVisitSystem().getTarget()?.userId ?? null) : null
        );
      }
      const walk = inCorr ? worldRef.current?.getCorridorWalk() : worldRef.current?.getLobbyWalk();
      if (inCorr || inLob) {
        setAvatarMode(walk?.avatar.getMode() ?? null);
      }
      if (inCorr) {
        setNearElevator(worldRef.current?.getCorridorWalk()?.getNearElevator() ?? false);
      }
      if (inLob) {
        setNearLobbyStairs(worldRef.current?.getLobbyWalk()?.getNearStairs() ?? false);
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [worldMode]);

  const visitingIdentity = useMemo(() => {
    if (!visitingUserId || !communityFeed) return null;
    return communityFeed.occupants.find((o) => o.userId === visitingUserId)?.identity ?? null;
  }, [visitingUserId, communityFeed]);

  useEffect(() => {
    worldRef.current?.setPresenceContext({ countryCode: homeCountry });
  }, [homeCountry]);

  useEffect(() => {
    const tick = () => {
      const world = worldRef.current;
      if (!world) return;
      void heartbeatAptPresence(world.getPresencePayload());
    };
    tick();
    const id = window.setInterval(tick, 25_000);
    return () => window.clearInterval(id);
  }, [worldMode, homeCountry]);

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

    world.setPresenceContext({ countryCode: homeCountry });

    world.setCallbacks({
      onModeChange: setWorldMode,
      onNearHomeDoor: (canEnter) => setNearHomeDoor(canEnter),
      onVisitMessage: (msg) => {
        setVisitToast(msg);
        window.setTimeout(() => setVisitToast(null), 2800);
      },
      onVisitFunnelChange: setVisitFunnel,
      onSocialPresenceChange: setSocialPresence,
    });

    setSocialPresence(world.getSocialSnapshot());

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
  const inDistrict = worldMode === "district";
  const inWorld = inDistrict || worldMode === "tower" || worldMode === "elevator";

  const modeGuide =
    worldMode === "district"
      ? "건물을 클릭하거나 「건물 접근」 · 화면 탭으로 단지 탐색"
      : worldMode === "tower" || worldMode === "elevator"
        ? "층을 선택한 뒤 엘리베이터로 이동 · 현관문 열린 집 방문"
        : worldMode === "lobby"
          ? "조이스틱으로 이동 · 엘리베이터·계단 이용"
          : worldMode === "corridor"
            ? isVisiting
              ? "복도 끝 현관문까지 이동 → 상호작용으로 입장"
              : "현관문 앞에서 상호작용 · 엘리베이터는 EV 앞에서"
            : isVisiting
              ? "가구 상호작용 · TV로 방송 시청"
              : "하단 「꾸미기」「내 집 소개」 · TV로 방송 시청";

  return (
    <div className="relative h-full w-full overflow-hidden touch-manipulation overscroll-none">
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
              onCommunityFeedChange={setCommunityFeed}
              onFeedLoadingChange={setFeedLoading}
              onRequireLogin={showLoginToast}
              visitRequestUserId={visitUserId}
              onVisitRequestHandled={() => setVisitUserId(null)}
              feedRefreshKey={feedRefreshKey}
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
              isVisiting={isVisiting}
              visitingIdentity={visitingIdentity}
            />
          </Suspense>
        </AptSceneErrorBoundary>
      </div>

      {/* 복도 / 로비 조작 UI */}
      <div className="absolute inset-0 z-40 pointer-events-none">
      {inCorridor && (
        <>
          {socialPresence && (
            <div className="pointer-events-none absolute right-3 top-20 z-10 flex max-w-[11rem] flex-col gap-1 rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-[10px] font-medium text-white/80 backdrop-blur-md">
              {socialPresence.mailboxUnread > 0 && (
                <span>📬 우편함 · 방문 {socialPresence.mailboxUnread}건</span>
              )}
              {socialPresence.recentVisitors[0] && (
                <span>
                  👣 {socialPresence.recentVisitors[0].displayName} · {socialPresence.recentVisitors[0].agoLabel}
                </span>
              )}
              {socialPresence.guestbookNames[0] && (
                <span>📖 방명록 · {socialPresence.guestbookNames.slice(0, 2).join(", ")}</span>
              )}
            </div>
          )}
          <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 z-10">
            <AptInteractPrompt
              label={
                nearHomeDoor
                  ? "현관문 입장"
                  : nearElevator
                    ? "엘리베이터"
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
                  ? isVisiting
                    ? "입장하기"
                    : "현관문 입장"
                  : nearElevator
                    ? "엘리베이터"
                    : isVisiting
                      ? "노크/벨"
                      : "노크"
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
            interactLabel="엘리베이터"
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

      {visitFunnel && !inInterior && (
        <div className="pointer-events-none absolute left-1/2 top-[5.25rem] z-[58] w-[min(100%,19rem)] -translate-x-1/2 px-3">
          <AptVisitFunnelPanel
            funnel={visitFunnel}
            onEnter={() => worldRef.current?.tryEnterHome()}
            onCancel={() => worldRef.current?.exitVisit()}
          />
        </div>
      )}

      {/* APT Daily Loop — 재방문 동기 */}
      {(inDistrict || inLobby || inWorld) && dailyOpen && (
        <div className="pointer-events-none absolute right-3 top-[4.5rem] z-[56] sm:right-4">
          <AptDailyLoopPanel
            feed={communityFeed}
            loading={feedLoading}
            isLoggedIn={isLoggedIn}
            onVisitUser={setVisitUserId}
            onRefresh={() => setFeedRefreshKey((k) => k + 1)}
            onRequireLogin={showLoginToast}
          />
        </div>
      )}

      {socialPresence && (inDistrict || inLobby || worldMode === "tower") && (
        <div className="pointer-events-none absolute top-[4.5rem] left-1/2 z-[55] flex max-w-[min(100%,22rem)] -translate-x-1/2 flex-col gap-1 px-3">
          <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-black/55 px-3 py-2 text-[10px] font-semibold text-white/90 backdrop-blur-md shadow-lg">
            <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-white">
              LIVE {socialPresence.onlineCount}
            </span>
            {socialPresence.streamingFloors.length > 0 && (
              <span className="rounded-full bg-pink-500/80 px-2 py-0.5 text-white">
                방송 {socialPresence.streamingFloors.length}
              </span>
            )}
            {socialPresence.elevatorBusy && (
              <span className="rounded-full bg-amber-500/80 px-2 py-0.5 text-white">엘리베이터 사용 중</span>
            )}
            {socialPresence.popularHome && (
              <span className="text-white/75">
                인기 · {socialPresence.popularHome.displayName} ({socialPresence.popularHome.homeFloor}F ·{" "}
                {socialPresence.popularHome.score})
              </span>
            )}
            {communityFeed?.daily.todayHome?.identity && (
              <span className="text-white/75">
                오늘의 집 · {formatIdentityBrief(communityFeed.daily.todayHome.identity)}
              </span>
            )}
          </div>
          <p className="text-center text-[10px] font-medium text-white/60 drop-shadow">
            {socialPresence.todayEvent}
            {socialPresence.mostActiveFloor && socialPresence.mostActiveFloor.onlineCount > 1
              ? ` · ${socialPresence.mostActiveFloor.floor}층 ${socialPresence.mostActiveFloor.onlineCount}명`
              : ""}
          </p>
        </div>
      )}
      </div>

      {/* 상단 네비 HUD — 항상 최상단 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
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

        <div className="pointer-events-auto flex flex-wrap justify-end gap-1.5 rounded-2xl border border-white/15 bg-black/45 p-1 backdrop-blur-md shadow-lg max-w-[min(100%,20rem)]">
          {isLoggedIn && !isVisiting && (
            <AptMyHomeButton
              compact
              onClick={() => worldRef.current?.goToMyHome()}
              className="shrink-0"
            />
          )}
          <button
            type="button"
            onClick={() => setDailyOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition-all"
          >
            <span className="hidden sm:inline">{dailyOpen ? "Daily 닫기" : "APT Daily"}</span>
            <span className="sm:hidden">Daily</span>
          </button>
          {inDistrict && (
            <>
              <button
                type="button"
                onClick={() => worldRef.current?.enterBuildingFromDistrict()}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold bg-sky-500/90 text-white shadow-md transition-all hover:bg-sky-500"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">건물 접근</span>
              </button>
              <button
                type="button"
                onClick={() => worldRef.current?.enterLobbyFromDistrict()}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition-all"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">로비 입장</span>
              </button>
            </>
          )}
          {(worldMode === "tower" || worldMode === "elevator") && (
            <button
              type="button"
              onClick={() => worldRef.current?.showTower()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition-all"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">전체 건물</span>
            </button>
          )}
          {inLobby && (
            <button
              type="button"
              onClick={() => worldRef.current?.showTower()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition-all"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">전체 건물</span>
            </button>
          )}
          {inCorridor && (
            <button
              type="button"
              onClick={() => worldRef.current?.corridorUseElevator()}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition-all"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">엘리베이터</span>
              <span className="sm:hidden">EV</span>
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
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-50 max-w-[min(100%,24rem)] px-3 pb-[env(safe-area-inset-bottom)]">
        <p className="rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-center text-[10px] font-semibold text-white/70 backdrop-blur-md">
          {modeGuide}
        </p>
      </div>
    </div>
  );
}
