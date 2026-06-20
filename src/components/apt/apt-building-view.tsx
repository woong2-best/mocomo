"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Box,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  ExternalLink,
  Globe2,
  Home,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AptProfileDto, CountryAptPreview, FloorOccupant } from "@/actions/apt";
import { getCountryFloorOccupants, listCountryApartments } from "@/actions/apt";
import { AptSimulationHud } from "@/components/apt/apt-simulation-hud";
import { AptTimeHud } from "@/components/apt/apt-time-hud";
import { AptEntranceDoorToggle } from "@/components/apt/apt-entrance-door-toggle";
import {
  APT_DEFAULT_FLOOR,
  APT_LOBBY_FLOOR,
  APT_PENTHOUSE_FLOOR,
  APT_TOTAL_FLOORS,
  DollhouseBuildingScene,
} from "@/lib/apt/building-scene";
import type { AptRoom } from "@/lib/apt/floor-plan-types";
import type { BondeeRoomState } from "@/lib/apt/bondee/types";
import { DEFAULT_BONDEE_ROOM } from "@/lib/apt/bondee/types";
import type { SimulationSnapshot } from "@/lib/apt/simulation/types";
import { WORLD_COUNTRIES, findCountry } from "@/lib/apt/world/world-countries";
import { countryFlag } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

function initPlansFromProfile(profile: AptProfileDto | null): Record<number, AptRoom[]> {
  if (profile?.floorPlans && Object.keys(profile.floorPlans).length > 0) {
    return profile.floorPlans;
  }
  return {};
}

export const AptBuildingView = memo(function AptBuildingView({
  initialProfile,
  bondeeRoom,
  isLoggedIn,
  onHomeRoomsChange,
  paused = false,
  doorOpen = true,
  onDoorToggle,
  interiorOverlay,
  homeFloor: homeFloorProp,
  insideHome = false,
  transition = null,
  onEnterHome,
  onExitHome,
  onFloorChange,
  onArriveHomeFloor,
}: {
  initialProfile: AptProfileDto | null;
  bondeeRoom: BondeeRoomState;
  isLoggedIn: boolean;
  onHomeRoomsChange?: (rooms: AptRoom[]) => void;
  paused?: boolean;
  doorOpen?: boolean;
  onDoorToggle?: () => void;
  interiorOverlay?: ReactNode;
  homeFloor?: number;
  insideHome?: boolean;
  transition?: "enter" | "exit" | null;
  onEnterHome?: () => void;
  onExitHome?: () => void;
  onFloorChange?: (floor: number) => void;
  onArriveHomeFloor?: () => void;
}) {
  const homeCountry = initialProfile?.countryCode ?? "KR";
  const homeFloor = homeFloorProp ?? initialProfile?.homeFloor ?? APT_DEFAULT_FLOOR;
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DollhouseBuildingScene | null>(null);
  const floorRef = useRef(homeFloor);
  const xrayRef = useRef(false);
  const simReadyRef = useRef(false);
  const plansRef = useRef<Record<number, AptRoom[]>>(initPlansFromProfile(initialProfile));
  const onArriveHomeFloorRef = useRef(onArriveHomeFloor);
  onArriveHomeFloorRef.current = onArriveHomeFloor;
  const isOwnAptRef = useRef(true);

  const [floor, setFloor] = useState(homeFloor);
  const [xray, setXray] = useState(true);
  const [moving, setMoving] = useState(false);
  const [plans, setPlans] = useState(() => initPlansFromProfile(initialProfile));
  const [toast, setToast] = useState<string | null>(null);
  const [simSnap, setSimSnap] = useState<SimulationSnapshot | null>(null);
  const [viewCountry, setViewCountry] = useState(homeCountry);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryApts, setCountryApts] = useState<CountryAptPreview[]>([]);
  const [floorOccupants, setFloorOccupants] = useState<FloorOccupant[]>([]);
  const [browseTarget, setBrowseTarget] = useState<CountryAptPreview | null>(null);
  const [loadingCountry, setLoadingCountry] = useState(false);
  const [worldHour, setWorldHour] = useState<number | null>(null);
  const [dayPhaseLabel, setDayPhaseLabel] = useState<string | null>(null);

  const countryAptsRef = useRef(countryApts);
  useEffect(() => {
    countryAptsRef.current = countryApts;
  }, [countryApts]);

  const isOwnApt = viewCountry === homeCountry && !browseTarget;
  isOwnAptRef.current = isOwnApt;
  const viewCountryInfo = findCountry(viewCountry);
  const atHomeFloor = floor === homeFloor && isOwnApt;
  const showTower = !insideHome || !!transition;

  const displayPlans = useMemo(() => {
    if (isOwnApt) return plans;
    if (browseTarget) return browseTarget.floorPlans;
    return {};
  }, [isOwnApt, plans, browseTarget]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  const goToFloorRaw = useCallback((next: number) => {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, next));
    if (clamped === floorRef.current && !sceneRef.current?.isRiding()) return;
    sceneRef.current?.setFloor(clamped);
  }, []);

  const goToFloor = useCallback(
    (next: number) => {
      onFloorChange?.(next);
      goToFloorRaw(next);
    },
    [onFloorChange, goToFloorRaw]
  );

  const goToFloorRef = useRef(goToFloor);
  goToFloorRef.current = goToFloor;

  useEffect(() => {
    xrayRef.current = xray;
    if (!moving) sceneRef.current?.setXray(xray);
  }, [xray, moving]);

  useEffect(() => {
    void (async () => {
      setLoadingCountry(true);
      try {
        const [list, occupants] = await Promise.all([
          listCountryApartments(viewCountry),
          getCountryFloorOccupants(viewCountry),
        ]);
        setCountryApts(list);
        setFloorOccupants(occupants);
        setBrowseTarget(null);
      } finally {
        setLoadingCountry(false);
      }
    })();
  }, [viewCountry]);

  useEffect(() => {
    sceneRef.current?.setFloorResidents(floorOccupants, isOwnApt ? homeFloor : null);
  }, [floorOccupants, homeFloor, isOwnApt]);

  useEffect(() => {
    sceneRef.current?.setBondeeRoom(isOwnApt ? bondeeRoom : null);
  }, [bondeeRoom, isOwnApt]);

  useEffect(() => {
    if (browseTarget) {
      sceneRef.current?.setVisitRoom(
        browseTarget.bondeeRoom ?? DEFAULT_BONDEE_ROOM,
        browseTarget.homeFloor
      );
    } else {
      sceneRef.current?.setVisitRoom(null, null);
    }
  }, [browseTarget]);

  useEffect(() => {
    sceneRef.current?.setFloorPlans(displayPlans);
  }, [displayPlans]);

  useEffect(() => {
    if (!browseTarget || isOwnApt) return;
    goToFloor(browseTarget.homeFloor);
  }, [browseTarget, isOwnApt, goToFloor]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new DollhouseBuildingScene(el, homeFloor);
    scene.setCallbacks({
      onFloorClick: (f) => goToFloorRef.current(f),
      onFloorScroll: (f) => goToFloorRef.current(f),
      onFloorDisplay: (f) => {
        floorRef.current = f;
        setFloor(f);
        onFloorChange?.(f);
      },
      onRideStart: () => setMoving(true),
      onRideEnd: () => {
        setMoving(false);
        if (floorRef.current === homeFloor && isOwnAptRef.current) {
          onArriveHomeFloorRef.current?.();
        }
      },
      onResidentClick: (f, resident) => {
        if (!resident.doorOpen) {
          showToastRef.current(`${resident.displayName}님 — 현관문이 닫혀 있어 구경할 수 없습니다`);
          return;
        }
        const apt =
          countryAptsRef.current.find((a) => a.userId === resident.userId) ??
          countryAptsRef.current.find((a) => a.homeFloor === f);
        if (apt) {
          setBrowseTarget(apt);
          goToFloorRef.current(apt.homeFloor);
          showToastRef.current(`${apt.displayName}님 집을 구경합니다`);
          return;
        }
        setBrowseTarget({
          userId: resident.userId,
          username: resident.username,
          displayName: resident.displayName,
          homeFloor: resident.homeFloor,
          floorPlans: {},
          bondeeRoom: DEFAULT_BONDEE_ROOM,
        });
        goToFloorRef.current(resident.homeFloor);
        showToastRef.current(`${resident.displayName}님 집을 구경합니다`);
      },
      onSimulationChange: (snap) => setSimSnap(snap),
      onTimeChange: (hour, phase) => {
        setWorldHour(hour);
        setDayPhaseLabel(phase);
      },
    });
    sceneRef.current = scene;
    scene.setFloorPlans(plansRef.current);
    scene.setBondeeRoom(bondeeRoom);

    if (isLoggedIn && initialProfile?.moveInCompleted) {
      void scene.startSimulation(homeFloor, initialProfile.residents, initialProfile.furniture);
      simReadyRef.current = true;
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
      simReadyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount WebGL once
  }, []);

  useEffect(() => {
    sceneRef.current?.setPaused(paused || insideHome || !!transition);
  }, [paused, insideHome, transition]);

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  return (
    <div className="folk-card overflow-hidden shadow-md border border-pink-100/80">
      <div className="flex flex-col lg:flex-row min-h-[min(88dvh,920px)]">
        <div className="relative flex-1 min-h-[560px] bg-gradient-to-br from-[#fef6f8] via-[#fff5f8] to-[#f0f4ff]">
          {/* 타워 3D — 집 안에 있을 때는 숨김 */}
          <div
            ref={mountRef}
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              !showTower && "invisible opacity-0"
            )}
          />

          {/* 집 실내 3D */}
          {interiorOverlay && (
            <div
              className={cn(
                "absolute inset-0 z-20 flex flex-col",
                !insideHome && !transition && "hidden",
                insideHome && !transition && "apt-view-enter"
              )}
            >
              {interiorOverlay}
            </div>
          )}

          {/* AC 스타일 전환 오버레이 */}
          {transition && (
            <div
              className={cn(
                "absolute inset-0 z-40 flex items-center justify-center bg-gradient-to-b from-[#fef6f8]/95 to-[#ffe8f0]/95 backdrop-blur-sm pointer-events-none",
                transition === "enter" ? "apt-home-enter-overlay" : "apt-home-exit-overlay"
              )}
            >
              <div className="rounded-2xl border-2 border-white/80 bg-white/90 px-8 py-5 shadow-xl text-center space-y-1">
                <p className="text-2xl">{transition === "enter" ? "🏠" : "🏢"}</p>
                <p className="text-sm font-bold text-folk-cobalt">
                  {transition === "enter" ? "집으로 들어가는 중…" : "타워로 나가는 중…"}
                </p>
                <p className="text-[10px] text-muted-foreground">{homeFloor}층</p>
              </div>
            </div>
          )}

          <AptSimulationHud snapshot={simSnap} />
          <AptTimeHud
            hour={worldHour}
            phaseLabel={dayPhaseLabel}
            className="absolute top-3 right-3 z-10 max-w-[min(100%,14rem)]"
          />

          {/* 상태 배지 */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-xl border border-white/80 bg-white/92 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-md">
            {insideHome && !transition ? (
              <div className="space-y-0.5">
                <p className="font-bold text-folk-terracotta flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5" />
                  내 집 · {homeFloor}층
                </p>
                <p className="text-[10px] text-muted-foreground">WASD 이동 · 엘리베이터로 다른 층</p>
              </div>
            ) : isOwnApt ? (
              <div className="space-y-0.5">
                <p className="font-bold text-folk-cobalt">
                  1000층 타워 · {floor}층
                  {floor === APT_PENTHOUSE_FLOOR && <span className="ml-1 text-folk-cobalt">· PH</span>}
                  {floor === APT_LOBBY_FLOOR && <span className="ml-1 text-folk-cobalt">· 입구</span>}
                </p>
                {atHomeFloor && (
                  <p className="text-[10px] text-folk-terracotta font-semibold">내 집층 — 들어가기 가능</p>
                )}
              </div>
            ) : (
              <p>
                {countryFlag(viewCountry)} {viewCountryInfo?.nameKo ?? viewCountry} 둘러보기
                {browseTarget && <span className="ml-1">· {browseTarget.displayName}</span>}
              </p>
            )}
          </div>

          {/* 내 집층 + 타워 뷰 → 집 들어가기 */}
          {atHomeFloor && isLoggedIn && !insideHome && !transition && onEnterHome && (
            <div className="pointer-events-auto absolute inset-x-0 bottom-[4.5rem] z-30 flex justify-center px-4">
              <button
                type="button"
                onClick={onEnterHome}
                className="group flex items-center gap-3 rounded-2xl border-2 border-folk-terracotta/40 bg-white/95 px-6 py-3.5 shadow-lg backdrop-blur-md transition-all hover:scale-[1.02] hover:border-folk-terracotta hover:shadow-xl active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-folk-terracotta/20 to-pink-100 text-xl shadow-inner">
                  🏠
                </span>
                <span className="text-left">
                  <span className="block text-sm font-bold text-folk-cobalt">집 들어가기</span>
                  <span className="block text-[10px] text-muted-foreground">{homeFloor}층 · 아바타·가구 꾸미기</span>
                </span>
                <DoorOpen className="h-5 w-5 text-folk-terracotta opacity-70 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          )}

          {/* 집 안 → 나가기 */}
          {insideHome && !transition && onExitHome && (
            <div className="pointer-events-auto absolute left-3 top-14 z-30">
              <button
                type="button"
                onClick={onExitHome}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-200/80 bg-white/95 px-3 py-2 text-[11px] font-bold text-neutral-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-neutral-50 hover:border-folk-cobalt/30"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                타워로 나가기
              </button>
            </div>
          )}

          {/* 층 슬라이더 — 집 안에서도 사용 가능 */}
          <div className="absolute right-[8.75rem] top-1/2 z-10 hidden lg:flex -translate-y-1/2 flex-col items-center gap-1 rounded-xl border border-neutral-200/80 bg-white/92 px-1.5 py-2 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              className="text-[8px] font-bold text-folk-terracotta hover:underline"
              onClick={() => goToFloor(APT_PENTHOUSE_FLOOR)}
              disabled={moving}
            >
              PH
            </button>
            <input
              type="range"
              min={APT_LOBBY_FLOOR}
              max={APT_PENTHOUSE_FLOOR}
              value={floor}
              disabled={moving}
              onChange={(e) => goToFloor(Number(e.target.value))}
              className="h-[min(52vh,480px)] w-4 accent-folk-terracotta cursor-pointer"
              style={{ writingMode: "vertical-lr", direction: "rtl" }}
              aria-label="전체 층 이동"
            />
            <button
              type="button"
              className="text-[8px] font-bold text-folk-cobalt hover:underline"
              onClick={() => goToFloor(APT_LOBBY_FLOOR)}
              disabled={moving}
            >
              입구
            </button>
          </div>

          {isOwnApt && isLoggedIn && onDoorToggle && !insideHome && (
            <div className="absolute left-3 top-[4.5rem] z-10 w-[min(100%,220px)] pointer-events-auto">
              <AptEntranceDoorToggle doorOpen={doorOpen} onToggle={onDoorToggle} compact />
            </div>
          )}

          {browseTarget && !isOwnApt && (
            <div className="absolute top-14 right-3 z-10 max-w-[220px] rounded-xl border border-folk-terracotta/40 bg-white/95 p-3 shadow-md backdrop-blur-sm space-y-2">
              <p className="text-xs font-bold text-folk-cobalt flex items-center gap-1.5">
                <UserRound className="h-3.5 w-3.5" />
                {browseTarget.displayName} · {browseTarget.homeFloor}층
              </p>
              <Button asChild size="sm" className="w-full h-8 rounded-lg text-xs gap-1">
                <Link href={`/u/${browseTarget.username}`}>
                  프로필 보기
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}

          {!insideHome && (
            <div className="pointer-events-none absolute left-3 bottom-3 rounded-xl border border-pink-100/80 bg-white/90 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm max-w-[260px] leading-snug shadow-sm">
              휠로 층 이동 · Ctrl+휠 확대 · {atHomeFloor ? "아래 버튼으로 집 들어가기" : "엘리베이터로 층 이동"}
            </div>
          )}

          {moving && (
            <div className="pointer-events-none absolute inset-x-0 top-[4.5rem] flex justify-center z-10">
              <span className="rounded-full border border-pink-200 bg-white/95 px-4 py-1.5 text-xs font-semibold text-pink-700 shadow-sm flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-pink-500 animate-bounce" />
                엘리베이터 이동 중 · {floor}층
              </span>
            </div>
          )}

          {toast && (
            <div className="pointer-events-none absolute top-[4.5rem] left-1/2 -translate-x-1/2 rounded-full border border-neutral-200 bg-white/95 px-4 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm z-20">
              {toast}
            </div>
          )}
        </div>

        {/* 사이드바 — 항상 표시 */}
        <aside className="flex w-full lg:w-[7.5rem] shrink-0 flex-col items-center border-t lg:border-t-0 lg:border-l border-neutral-200/80 bg-gradient-to-b from-white to-[#fff8fa] px-3 py-4 gap-2 relative">
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setCountryOpen((v) => !v)}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-2 transition-all",
                countryOpen
                  ? "border-folk-terracotta bg-folk-terracotta/10 shadow-sm"
                  : "border-neutral-200 bg-white hover:bg-neutral-50"
              )}
              title="국가별 아파트 보기"
            >
              <Globe2 className="h-4 w-4 text-folk-cobalt" />
              <span className="text-lg leading-none">{countryFlag(viewCountry)}</span>
              <span className="text-[9px] font-bold text-folk-cobalt truncate max-w-full px-1">
                {viewCountryInfo?.nameKo ?? viewCountry}
              </span>
            </button>

            {countryOpen && (
              <div className="absolute bottom-full left-0 right-0 z-20 mb-1 max-h-52 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
                {WORLD_COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setViewCountry(c.code);
                      setCountryOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-2 py-1.5 text-left text-[10px] hover:bg-neutral-50",
                      viewCountry === c.code && "bg-folk-terracotta/10 font-bold"
                    )}
                  >
                    <span>{countryFlag(c.code)}</span>
                    <span className="truncate">{c.nameKo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isOwnApt && (
            <div className="w-full space-y-1 max-h-28 overflow-y-auto">
              {loadingCountry && <p className="text-[9px] text-center text-muted-foreground">불러오는 중…</p>}
              {countryApts.map((apt) => (
                <button
                  key={apt.userId}
                  type="button"
                  onClick={() => setBrowseTarget(apt)}
                  className={cn(
                    "w-full rounded-lg border px-1.5 py-1 text-[9px] text-left truncate",
                    browseTarget?.userId === apt.userId
                      ? "border-folk-terracotta bg-folk-terracotta/10"
                      : "border-neutral-200 hover:bg-neutral-50"
                  )}
                >
                  {apt.displayName} · {apt.homeFloor}층
                </button>
              ))}
            </div>
          )}

          {!isOwnApt && (
            <button
              type="button"
              onClick={() => {
                setViewCountry(homeCountry);
                setBrowseTarget(null);
                goToFloor(homeFloor);
              }}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white py-1.5 text-[9px] font-bold text-folk-cobalt hover:bg-neutral-50"
            >
              <Home className="h-3 w-3" />
              내 아파트
            </button>
          )}

          {atHomeFloor && isLoggedIn && (
            <button
              type="button"
              onClick={() => (insideHome ? onExitHome?.() : onEnterHome?.())}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-2 transition-all",
                insideHome
                  ? "border-folk-cobalt/40 bg-folk-cobalt/8 text-folk-cobalt"
                  : "border-folk-terracotta/50 bg-folk-terracotta/10 text-folk-terracotta shadow-sm"
              )}
            >
              {insideHome ? (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-[9px] font-bold">나가기</span>
                </>
              ) : (
                <>
                  <Home className="h-4 w-4" />
                  <span className="text-[9px] font-bold">집 들어가기</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setXray((v) => !v)}
            disabled={insideHome}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all",
              insideHome && "opacity-40 pointer-events-none",
              xray
                ? "border-pink-300 bg-pink-50 text-pink-600 shadow-sm"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            )}
            aria-label="단면도 보기"
          >
            <Box className="h-5 w-5" strokeWidth={2.25} />
          </button>

          <div className="flex flex-1 flex-col items-center justify-center gap-2 w-full max-w-[4.5rem]">
            <button
              type="button"
              disabled={floor >= APT_TOTAL_FLOORS || moving}
              onClick={() => goToFloor(floor + 1)}
              className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-neutral-200 bg-white text-neutral-700 transition-all hover:bg-neutral-50 hover:-translate-y-0.5 disabled:opacity-35 disabled:pointer-events-none"
              aria-label="위층"
            >
              <ChevronUp className="h-7 w-7" strokeWidth={2.5} />
            </button>

            <div
              className={cn(
                "flex h-16 w-full flex-col items-center justify-center rounded-xl border-[3px] bg-white font-display font-bold tabular-nums shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300",
                atHomeFloor ? "border-folk-terracotta/60 text-folk-terracotta" : "border-neutral-200 text-neutral-800",
                moving && "scale-95 border-pink-300"
              )}
            >
              <span className="text-3xl leading-none">{floor}</span>
              {atHomeFloor && <span className="text-[8px] font-bold mt-0.5">내 집</span>}
            </div>

            <button
              type="button"
              disabled={floor <= APT_LOBBY_FLOOR || moving}
              onClick={() => goToFloor(floor - 1)}
              className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-neutral-200 bg-white text-neutral-700 transition-all hover:bg-neutral-50 hover:translate-y-0.5 disabled:opacity-35 disabled:pointer-events-none"
              aria-label="아래층"
            >
              <ChevronDown className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground tabular-nums">{APT_LOBBY_FLOOR} – {APT_TOTAL_FLOORS}층</p>
        </aside>
      </div>
    </div>
  );
});
