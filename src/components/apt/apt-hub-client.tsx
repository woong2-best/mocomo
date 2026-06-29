"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, DoorOpen, Home, KeyRound, Menu, X } from "lucide-react";
import Link from "next/link";
import type { AptProfileDto, CountryAptPreview } from "@/actions/apt";
import { recordAptHomeVisit } from "@/actions/apt-presence";
import { setHomePublic } from "@/actions/apt-world";
import type { BondeeHomeState } from "@/lib/apt/bondee/types";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import { AptSceneErrorBoundary } from "@/components/apt/apt-scene-error-boundary";
import type { AptStudioInventoryItem } from "@/studio/lib/apt-types";
import type { AptGameState } from "@/lib/apt/game/types";
import type { EconomySnapshot } from "@/lib/apt/economy/types";
import type { UnifiedAptWorldScene } from "@/lib/apt/world/unified-apt-world-scene";
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
import { cn } from "@/lib/utils";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { AptOverviewHero } from "@/components/apt/apt-overview-hero";
import { AptBuildStamp } from "@/components/apt/game/apt-build-stamp";
import { hydrateLocalHome, saveLocalFloorPlan, setLocalHomeUserId } from "@/lib/apt/local-home-store";
import { APT_GAME_PATH } from "@/lib/site-routes";

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
  initialGameState = null,
  initialEconomy = null,
  gameLoadError = false,
  userLevel = 1,
  userAvatarUrl = null,
  userName = null,
}: {
  initialProfile: AptProfileDto | null;
  bondeeHome: BondeeHomeState;
  homeRooms: AptRoom[];
  isLoggedIn: boolean;
  studioInventory?: AptStudioInventoryItem[];
  currentUserId?: string | null;
  initialGameState?: AptGameState | null;
  initialEconomy?: EconomySnapshot | null;
  gameLoadError?: boolean;
  userLevel?: number;
  userAvatarUrl?: string | null;
  userName?: string | null;
}) {
  const worldRef = useRef<UnifiedAptWorldScene | null>(null);
  const [started, setStarted] = useState(false);
  const [startPhase, setStartPhase] = useState<"idle" | "contract" | "home">("idle");
  const [worldMode, setWorldMode] = useState<AptWorldMode>("tower");
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
  const [interiorHudPeek, setInteriorHudPeek] = useState(false);
  const [visitHost, setVisitHost] = useState<CountryAptPreview | null>(null);
  const [browseClearTick, setBrowseClearTick] = useState(0);
  const homeFloor = initialProfile?.homeFloor ?? APT_DEFAULT_FLOOR;
  const { isNativeApp } = useClientPlatform();
  const localHomeSeeded = useRef(false);

  useEffect(() => {
    if (currentUserId) setLocalHomeUserId(currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (localHomeSeeded.current) return;
    void hydrateLocalHome({
      serverRooms: initialHomeRooms,
      serverBondee: bondeeHome,
      serverGame: initialGameState,
    }).then((bundle) => {
      setHomeRooms(bundle.rooms.map((r) => ({ ...r })));
      setHomeState({ ...bundle.bondee, items: [...bundle.bondee.items] });
      localHomeSeeded.current = true;
    });
  }, [initialHomeRooms, bondeeHome, initialGameState]);

  useEffect(() => {
    if (!localHomeSeeded.current) return;
    void saveLocalFloorPlan(homeRooms);
  }, [homeRooms]);

  const endVisit = useCallback(() => {
    setVisitHost(null);
    setIsVisiting(false);
    setVisitingUserId(null);
    setBrowseClearTick((t) => t + 1);
    setWorldMode("tower");
  }, []);

  const handleBrowseTargetChange = useCallback(
    (target: CountryAptPreview | null) => {
      setVisitHost(target);
      if (target && currentUserId && target.userId !== currentUserId) {
        setIsVisiting(true);
        setVisitingUserId(target.userId);
      } else if (!target) {
        setIsVisiting(false);
        setVisitingUserId(null);
      }
    },
    [currentUserId]
  );

  const moveInCompleted = isLoggedIn;

  // 메인 버튼:
  // - 로그인 사용자 → 내 집으로 바로 입장
  // - 비로그인 사용자 → 회원가입
  const enterHome = useCallback(() => {
    setStarted(true);
    setStartPhase("home");
    setWorldMode("interior");
  }, []);

  const startExperience = useCallback(() => {
    if (moveInCompleted || isNativeApp) {
      enterHome();
      return;
    }
    setStartPhase("contract");
    window.location.href = "/auth/signup/apply";
  }, [moveInCompleted, isNativeApp, enterHome]);

  // 로그인 버튼: 로그인 창 → 로그인되면 내 집 게임으로.
  const goToLogin = useCallback(() => {
    setStartPhase("contract");
    window.location.href =
      "/auth/signin?callbackUrl=" + encodeURIComponent(`${APT_GAME_PATH}?home=1`);
  }, []);

  // 로그인 직후(?home=1)로 들어온 사용자는 내 집으로 바로 입장.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("home") !== "1") return;
    setStarted(true);
    setStartPhase("home");
    setWorldMode("interior");
    window.history.replaceState(null, "", APT_GAME_PATH);
  }, [isLoggedIn]);

  // 네이티브 앱 + 로그인: 바로 집(게임 홈)으로
  useEffect(() => {
    if (!isNativeApp || !isLoggedIn || started) return;
    enterHome();
  }, [isNativeApp, isLoggedIn, started, enterHome]);

  const showLoginToast = useCallback((action: string) => {
    setVisitToast(`로그인 후 ${action}할 수 있습니다`);
    window.setTimeout(() => setVisitToast(null), 2800);
  }, []);

  const toggleDoor = useCallback(async () => {
    const next = !doorOpen;
    setDoorOpen(next);
    await setHomePublic(next);
  }, [doorOpen]);

  useEffect(() => {
    if (initialProfile) setDoorOpen(initialProfile.homePublic);
  }, [initialProfile?.homePublic]);

  useEffect(() => {
    if (visitFunnel) setDailyOpen(false);
  }, [visitFunnel]);

  const visitRecordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (worldMode !== "interior" || !visitHost?.userId || !currentUserId) return;
    if (visitHost.userId === currentUserId) return;
    if (visitRecordedRef.current === visitHost.userId) return;
    visitRecordedRef.current = visitHost.userId;
    void recordAptHomeVisit(visitHost.userId);
  }, [worldMode, visitHost?.userId, currentUserId]);

  useEffect(() => {
    if (!visitHost) visitRecordedRef.current = null;
  }, [visitHost]);

  useEffect(() => {
    const inCorr = worldMode === "corridor";
    const inLob = worldMode === "lobby";
    const inInt = worldMode === "interior";
    if (!inCorr && !inLob && !inInt) {
      setAvatarMode(null);
      setNearHomeDoor(false);
      setNearElevator(false);
      setNearLobbyStairs(false);
      return;
    }
    setAvatarMode(inCorr || inLob ? "chibi" : null);
    setNearHomeDoor(inCorr);
    setNearElevator(inCorr);
    setNearLobbyStairs(inLob);
  }, [worldMode]);

  const visitingIdentity = useMemo(() => {
    if (!visitingUserId || !communityFeed) return null;
    return communityFeed.occupants.find((o) => o.userId === visitingUserId)?.identity ?? null;
  }, [visitingUserId, communityFeed]);

  const inInterior = worldMode === "interior";
  const inGameHome = inInterior && isLoggedIn && !isVisiting;

  useEffect(() => {
    if (!inInterior) setInteriorHudPeek(false);
  }, [inInterior]);

  useEffect(() => {
    if (!isVisiting || !isLoggedIn) return;
    void import("@/actions/apt-game").then(({ reportAptGameEvent }) =>
      reportAptGameEvent({ type: "visit_friend" }).then((game) => {
        if (!game || "error" in game) return;
        const mission = game.missions.find((m) => m.id === "daily-visit-friend");
        if (mission?.completed) {
          window.dispatchEvent(
            new CustomEvent("apt-game-toast", {
              detail: { message: "친구 집 방문 미션 완료! 🎯", kind: "mission" },
            })
          );
        }
      })
    );
  }, [isVisiting, isLoggedIn]);

  useEffect(() => {
    if (!interiorHudPeek) return;
    const t = window.setTimeout(() => setInteriorHudPeek(false), 4500);
    return () => window.clearTimeout(t);
  }, [interiorHudPeek]);

  const showInteriorHud = !inGameHome && (!inInterior || interiorHudPeek);
  const inCorridor = worldMode === "corridor";
  const inLobby = worldMode === "lobby";
  const inDistrict = worldMode === "district";
  const inWorld = inDistrict || worldMode === "tower" || worldMode === "elevator";

  const modeGuide =
    worldMode === "district"
      ? "건물을 클릭하거나 「건물 접근」 · 화면 탭으로 단지 탐색"
      : worldMode === "tower" || worldMode === "elevator"
        ? "위에서 내려다보는 아파트 · 층을 탭해 이동"
        : worldMode === "lobby"
          ? "조이스틱으로 이동 · 엘리베이터·계단 이용"
          : worldMode === "corridor"
            ? isVisiting
              ? "현관문 앞에서 입장"
              : "내 집은 바로 입장 · 엘리베이터는 EV"
            : isVisiting
              ? "가구 상호작용 · TV로 방송 시청"
              : "하단 「꾸미기」「내 집 소개」 · TV로 방송 시청";

  return (
    <div className="relative h-full w-full overflow-hidden touch-manipulation overscroll-none">
      <Apt2DWorldBackdrop mode={worldMode} floor={homeFloor} regionLabel={initialProfile?.regionLabel} />

      {!started && isNativeApp && (
        <AptOverviewHero
          isLoggedIn={isLoggedIn}
          homeFloor={homeFloor}
          regionLabel={initialProfile?.regionLabel}
          startPhase={startPhase}
          onEnter={startExperience}
          onSignup={() => {
            setStartPhase("contract");
            window.location.href = "/auth/signup/apply";
          }}
          onLogin={goToLogin}
        />
      )}

      {!started && !isNativeApp && (
        <div className="absolute inset-0 z-[80] flex items-end justify-center bg-[#eef3f5] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:items-center">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/2 top-10 h-[62vh] w-[18rem] -translate-x-1/2 rounded-t-[3rem] border-[10px] border-slate-800/80 bg-gradient-to-b from-slate-200 to-slate-100 shadow-2xl">
              <div className="absolute left-1/2 top-8 h-40 w-24 -translate-x-1/2 rounded-t-2xl border-4 border-slate-700 bg-slate-300">
                <div className="absolute inset-x-3 top-4 h-28 rounded-t-xl bg-gradient-to-b from-white to-slate-200 shadow-inner" />
                <div className="absolute bottom-3 left-1/2 h-8 w-1 -translate-x-1/2 bg-slate-700" />
              </div>
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute h-5 w-8 rounded-md border-2 border-slate-700/60 bg-white/80"
                  style={{
                    left: i % 2 === 0 ? "2.25rem" : "12.25rem",
                    top: `${5.25 + i * 3.6}rem`,
                  }}
                />
              ))}
              <div className="absolute bottom-0 left-1/2 h-20 w-28 -translate-x-1/2 rounded-t-3xl border-4 border-slate-700 bg-white shadow-inner" />
            </div>
            <div className="absolute left-8 top-20 rotate-[-8deg] rounded-2xl border-4 border-slate-800 bg-white/90 px-3 py-2 text-xs font-black text-slate-800 shadow-lg">
              CCTV 00:00
            </div>
            <div className="absolute right-8 top-24 rounded-full border-4 border-slate-800 bg-white p-3 shadow-lg">
              <Menu className="h-6 w-6 text-slate-800" />
            </div>
          </div>

          <div className="relative w-full max-w-sm rounded-[2rem] border-4 border-slate-900 bg-white/95 p-5 text-center shadow-2xl backdrop-blur">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] border-4 border-slate-900 bg-slate-50">
              <div className="h-10 w-8 rounded-b-2xl rounded-t-[1.1rem] border-[3px] border-slate-900 bg-white" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">MOCOMO</p>
            <h1 className="mt-2 text-2xl font-black text-slate-950">
              {isLoggedIn ? "내 공간에서 시작" : "MoCoMo 시작"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {isLoggedIn
                ? `${initialProfile?.regionLabel ?? "MOCOMO APT"} ${homeFloor}층 · 바로 시작합니다.`
                : "가입하면 별도 이동 연출 없이 바로 내 공간을 시작합니다."}
            </p>

            <button
              type="button"
              onClick={startExperience}
              disabled={startPhase !== "idle"}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-4 border-slate-950 bg-slate-950 px-5 py-4 text-lg font-black text-white shadow-[0_6px_0_rgba(15,23,42,0.25)] transition active:translate-y-1 active:shadow-none disabled:opacity-70"
            >
              {startPhase === "contract" ? (
                <>
                  <KeyRound className="h-5 w-5" />
                  이동 중…
                </>
              ) : startPhase === "home" ? (
                <>
                  <DoorOpen className="h-5 w-5" />
                  현관문 여는 중
                </>
              ) : moveInCompleted ? (
                <>
                  <Home className="h-5 w-5" />
                  내 집으로 입장
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5" />
                  회원가입
                </>
              )}
            </button>

            {!moveInCompleted && (
              <button
                type="button"
                onClick={goToLogin}
                disabled={startPhase !== "idle"}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition active:translate-y-0.5 disabled:opacity-70"
              >
                <KeyRound className="h-4 w-4" />
                이미 계정이 있어요 · 로그인
              </button>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              {moveInCompleted
                ? "내 공간으로 바로 들어갑니다."
                : "처음이라면 회원가입 후 바로 시작하세요. 계정이 있으면 로그인하면 됩니다."}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-1">999층</span>
              <span className="rounded-full bg-slate-100 px-2 py-1">국가별 APT</span>
              <span className="rounded-full bg-slate-100 px-2 py-1">바로 시작</span>
            </div>
          </div>
        </div>
      )}

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
              onBrowseTargetChange={handleBrowseTargetChange}
              clearBrowseTick={browseClearTick}
            />
            {inInterior && (
              <AptBondeeRoom
                initialState={homeState}
                rooms={homeRooms}
                isLoggedIn={isLoggedIn}
                studioInventory={studioInventory}
                onHomeChange={setHomeState}
                paused={false}
                doorOpen={doorOpen}
                onDoorToggle={() => void toggleDoor()}
                skipSceneMount={false}
                worldMode={worldMode}
                isVisiting={isVisiting}
                visitingIdentity={visitingIdentity}
                layoutOwnerUserId={visitHost?.userId ?? currentUserId}
                onExitInterior={() => setWorldMode("corridor")}
                onEndVisit={endVisit}
                furnitureHintState={{
                  hasUnreadMail: (socialPresence?.mailboxUnread ?? 0) > 0,
                  hasMissedCall: false,
                }}
                initialGame={initialGameState}
                gameLoadError={gameLoadError}
                initialEconomy={initialEconomy}
                userLevel={userLevel}
                userAvatarUrl={userAvatarUrl}
                userName={userName}
              />
            )}
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
              onMove={() => undefined}
              onInteract={() => {
                if (nearHomeDoor) setWorldMode("interior");
                else if (nearElevator) setWorldMode("tower");
                else {
                  setVisitToast("2D 복도 안내판을 확인했습니다");
                  window.setTimeout(() => setVisitToast(null), 2200);
                }
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
              onClick={() => {
                setVisitToast("2D 안내판: 오늘도 이웃과 가볍게 인사해 보세요");
                window.setTimeout(() => setVisitToast(null), 2200);
              }}
              className="rounded-xl border border-white/20 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white/80 backdrop-blur-md"
            >
              CCTV · 안내판 (F)
            </button>
            {isVisiting && (
              <button
                type="button"
                onClick={endVisit}
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
            onMove={() => undefined}
            onInteract={() => setWorldMode("tower")}
            canInteract
            interactLabel="엘리베이터"
          />
          <button
            type="button"
            onClick={() => setWorldMode("corridor")}
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
            onEnter={() => setWorldMode("interior")}
            onCancel={() => setVisitFunnel(null)}
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

      {/* 상단 네비 HUD — 실내에서는 좌상단 탭 시에만 표시 */}
      {inInterior && !interiorHudPeek && (
        <button
          type="button"
          aria-label="메뉴 열기"
          onClick={() => setInteriorHudPeek(true)}
          className="pointer-events-auto absolute left-0 top-0 z-[55] h-12 w-12 opacity-0"
        />
      )}
      {showInteriorHud && (
      <div className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between sm:p-4",
        inInterior ? "p-2 pt-[max(0.35rem,env(safe-area-inset-top))]" : "p-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      )}>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "flex items-center justify-center rounded-xl border text-white backdrop-blur-md shadow-lg transition hover:bg-black/60",
              inInterior
                ? "h-8 w-8 border-black/10 bg-white/45 text-slate-700"
                : "h-10 w-10 border-white/20 bg-black/45"
            )}
            aria-label="메뉴"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
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

        <div className={cn(
          "pointer-events-auto flex flex-wrap justify-end gap-1.5 rounded-2xl border p-1 backdrop-blur-md shadow-lg max-w-[min(100%,20rem)]",
          inInterior ? "border-black/8 bg-white/45" : "border-white/15 bg-black/45"
        )}>
          {isLoggedIn && !isVisiting && !inInterior && (
            <AptMyHomeButton
              compact
              onClick={() => setWorldMode("interior")}
              className="shrink-0"
            />
          )}
          {!inInterior && (
          <button
            type="button"
            onClick={() => setDailyOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/20 transition-all"
          >
            <span className="hidden sm:inline">{dailyOpen ? "Daily 닫기" : "APT Daily"}</span>
            <span className="sm:hidden">Daily</span>
          </button>
          )}
          {inDistrict && (
            <>
              <button
                type="button"
                onClick={() => setWorldMode("tower")}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold bg-sky-500/90 text-white shadow-md transition-all hover:bg-sky-500"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">건물 접근</span>
              </button>
              <button
                type="button"
                onClick={() => setWorldMode("lobby")}
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
              onClick={() => setWorldMode("tower")}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition-all"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">전체 건물</span>
            </button>
          )}
          {inLobby && (
            <button
              type="button"
              onClick={() => setWorldMode("tower")}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition-all"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">전체 건물</span>
            </button>
          )}
          {inCorridor && (
            <button
              type="button"
              onClick={() => setWorldMode("tower")}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white/80 hover:bg-white/10 transition-all"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">엘리베이터</span>
              <span className="sm:hidden">EV</span>
            </button>
          )}
          {inInterior && isVisiting && (
            <button
              type="button"
              onClick={endVisit}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-pink-200 hover:bg-pink-500/20"
            >
              방문 종료
            </button>
          )}
        </div>
      </div>
      )}

      {/* 모드 안내 */}
      {!inInterior && (
      <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-50 max-w-[min(100%,24rem)] px-3 pb-[env(safe-area-inset-bottom)]">
        <p className="rounded-full border border-white/15 bg-black/50 px-4 py-1.5 text-center text-[10px] font-semibold text-white/70 backdrop-blur-md">
          {modeGuide}
        </p>
      </div>
      )}

      <AptBuildStamp visible={inInterior} />
    </div>
  );
}

function Apt2DWorldBackdrop({
  mode,
  floor,
  regionLabel,
}: {
  mode: AptWorldMode;
  floor: number;
  regionLabel?: string | null;
}) {
  const isLobby = mode === "lobby";
  const isCorridor = mode === "corridor";
  const isInterior = mode === "interior";

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#e8dfd4]">
      {!isInterior && (
      <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#fff7e8_0,#eaf7ff_42%,#f8edf5_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(120,100,80,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(120,100,80,0.035)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="pointer-events-none absolute -left-16 top-12 h-28 w-52 rounded-full bg-white/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 top-24 h-36 w-44 rounded-full bg-sky-100/60 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-emerald-200/75 via-emerald-100/30 to-transparent" />
      </>
      )}

      {(mode === "tower" || mode === "elevator" || mode === "district") && (
        <div className="absolute left-1/2 top-1/2 h-[74vh] w-[min(26rem,80vw)] -translate-x-1/2 -translate-y-1/2 rounded-t-[3rem] border border-black/10 bg-gradient-to-b from-white/95 via-amber-50/90 to-rose-50/80 shadow-[0_28px_72px_rgba(91,79,65,0.22)]">
          <div className="absolute inset-x-6 top-0 h-6 rounded-b-2xl bg-gradient-to-b from-slate-200/80 to-transparent" />
          <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full border border-black/10 bg-white/90 px-4 py-1.5 text-xs font-bold text-slate-700 shadow-sm">
            {regionLabel ?? "MOCOMO APT"} · {floor}F
          </div>
          {Array.from({ length: 12 }).map((_, i) => {
            const unit = `${floor}${(i % 4) + 1}`;
            const lit = i % 5 === 1 || i % 5 === 3;
            return (
              <div
                key={i}
                className={`absolute h-8 w-14 rounded-xl border border-black/10 shadow-[inset_0_-5px_10px_rgba(91,79,65,0.07)] ${lit ? "bg-amber-100/95" : "bg-white/88"}`}
                style={{
                  left: i % 3 === 0 ? "14%" : i % 3 === 1 ? "40%" : "66%",
                  top: `${13 + Math.floor(i / 3) * 12.5}%`,
                }}
              >
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-500">
                  {unit}
                </span>
                {lit && (
                  <span className="absolute inset-x-[20%] top-[22%] h-[38%] rounded-sm bg-gradient-to-b from-sky-100/90 to-white/40" />
                )}
              </div>
            );
          })}
          <div className="absolute bottom-0 left-1/2 h-28 w-36 -translate-x-1/2 rounded-t-3xl border border-black/10 bg-gradient-to-b from-white/95 to-amber-50/90 shadow-[inset_0_12px_20px_rgba(91,79,65,0.06)]">
            <div className="absolute left-1/2 top-6 flex h-16 w-20 -translate-x-1/2 flex-col items-center justify-between rounded-xl border border-black/10 bg-slate-800/90 p-2">
              <span className="text-[9px] font-bold text-emerald-300">▲</span>
              <span className="text-sm font-black text-white">{floor}</span>
              <span className="text-[9px] font-bold text-rose-300">▼</span>
            </div>
          </div>
        </div>
      )}

      {isLobby && (
        <div className="absolute left-1/2 top-1/2 grid w-[min(44rem,88vw)] -translate-x-1/2 -translate-y-1/2 grid-cols-3 gap-4 rounded-[2rem] border border-black/10 bg-white/85 p-5 shadow-[0_28px_72px_rgba(91,79,65,0.2)] backdrop-blur-md">
          <div className="col-span-2 h-52 rounded-2xl border border-black/10 bg-gradient-to-br from-amber-50 to-rose-50 shadow-inner">
            <div className="mx-auto mt-10 h-28 w-44 rounded-t-[2rem] border border-black/10 bg-white/85 shadow-[0_12px_24px_rgba(91,79,65,0.1)]">
              <div className="mx-auto mt-6 h-16 w-24 rounded-lg bg-gradient-to-b from-sky-100 to-white" />
            </div>
          </div>
          <div className="h-52 rounded-2xl border border-black/10 bg-sky-50 p-4">
            <div className="h-full rounded-xl bg-gradient-to-b from-white to-sky-100 shadow-inner">
              <div className="mx-auto mt-8 h-20 w-12 rounded-lg border border-black/10 bg-slate-700/90">
                <span className="mt-6 block text-center text-[10px] font-bold text-emerald-300">▲</span>
              </div>
            </div>
          </div>
          <div className="col-span-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-center text-sm font-semibold text-slate-700">
            로비 · 엘리베이터에서 층을 고르고 이웃 집으로 이동
          </div>
        </div>
      )}

      {isCorridor && (
        <div className="absolute left-1/2 top-1/2 w-[min(48rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-black/10 bg-white/85 p-5 shadow-[0_28px_72px_rgba(91,79,65,0.2)] backdrop-blur-md">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="group h-32 rounded-2xl border border-black/10 bg-gradient-to-b from-rose-50 to-white p-2 shadow-sm">
                <div className="relative h-full rounded-xl border border-black/10 bg-white/90">
                  <p className="mt-3 text-center text-[10px] font-bold text-slate-400">
                    {floor}
                    {String(i + 1).padStart(2, "0")}호
                  </p>
                  <div className="mx-auto mt-3 h-10 w-10 rounded-full border-2 border-slate-800 bg-[#fffdf6] opacity-70 transition-opacity group-hover:opacity-100" />
                  <div className="mx-auto mt-1 h-6 w-8 rounded-b-full border-2 border-t-0 border-slate-800 bg-[#fffdf6] opacity-70 transition-opacity group-hover:opacity-100" />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm font-semibold text-slate-700">복도 · 호실을 눌러 집을 둘러보는 공간</p>
        </div>
      )}
    </div>
  );
}
