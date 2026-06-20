"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
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
}: {
  initialProfile: AptProfileDto | null;
  bondeeRoom: BondeeRoomState;
  isLoggedIn: boolean;
  onHomeRoomsChange?: (rooms: AptRoom[]) => void;
  paused?: boolean;
  doorOpen?: boolean;
  onDoorToggle?: () => void;
}) {
  const homeCountry = initialProfile?.countryCode ?? "KR";
  const homeFloor = initialProfile?.homeFloor ?? APT_DEFAULT_FLOOR;
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DollhouseBuildingScene | null>(null);
  const floorRef = useRef(homeFloor);
  const simReadyRef = useRef(false);
  const plansRef = useRef<Record<number, AptRoom[]>>(initPlansFromProfile(initialProfile));

  const [floor, setFloor] = useState(homeFloor);
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
  const [elevatorOpen, setElevatorOpen] = useState(false);

  const countryAptsRef = useRef(countryApts);
  useEffect(() => {
    countryAptsRef.current = countryApts;
  }, [countryApts]);

  const isOwnApt = viewCountry === homeCountry && !browseTarget;
  const viewCountryInfo = findCountry(viewCountry);

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

  const goToFloor = useCallback((next: number) => {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(APT_LOBBY_FLOOR, next));
    if (clamped === floorRef.current && !sceneRef.current?.isRiding()) return;
    sceneRef.current?.setFloor(clamped);
  }, []);

  const goToFloorRef = useRef(goToFloor);
  goToFloorRef.current = goToFloor;

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
    sceneRef.current?.setFloorResidents(
      floorOccupants,
      isOwnApt ? homeFloor : null
    );
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
      },
      onRideStart: () => setMoving(true),
      onRideEnd: () => setMoving(false),
      onResidentClick: (f, resident) => {
        if (!resident.doorOpen) {
          showToastRef.current(`${resident.displayName}님 — 현관문이 닫혀 있어 방문할 수 없습니다`);
          return;
        }
        showToastRef.current(`${resident.displayName}님 집 — 노크 후 입장`);
        const apt =
          countryAptsRef.current.find((a) => a.userId === resident.userId) ??
          countryAptsRef.current.find((a) => a.homeFloor === f);
        if (apt) {
          setBrowseTarget(apt);
          goToFloorRef.current(apt.homeFloor);
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
    sceneRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  return (
    <div className="relative h-full w-full">
      <div ref={mountRef} className="absolute inset-0" />

      <AptSimulationHud snapshot={simSnap} />
      <AptTimeHud
        hour={worldHour}
        phaseLabel={dayPhaseLabel}
        className="absolute top-14 right-3 z-10 max-w-[min(100%,14rem)] border-white/15 bg-black/45 [&_*]:text-white/90"
      />

      {/* Floor indicator — elevator style */}
      <div className="pointer-events-none absolute left-1/2 top-14 z-10 -translate-x-1/2">
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border border-white/20 bg-black/55 px-4 py-2 backdrop-blur-md shadow-xl transition-all",
            moving && "border-sky-400/50 scale-105"
          )}
        >
          {moving && (
            <span className="inline-block h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          )}
          <span className="text-2xl font-black tabular-nums text-white">{floor}</span>
          <span className="text-[10px] font-bold text-white/60">
            {floor === APT_PENTHOUSE_FLOOR ? "PH" : floor === APT_LOBBY_FLOOR ? "로비" : "층"}
            {isOwnApt && isLoggedIn && floor === homeFloor && " · 내 집"}
          </span>
        </div>
      </div>

      {/* Country / visit info */}
      <div className="pointer-events-none absolute left-3 top-14 rounded-xl border border-white/15 bg-black/45 px-3 py-2 text-xs text-white/80 backdrop-blur-md shadow-lg max-w-[220px]">
        {isOwnApt ? (
          <p>{APT_TOTAL_FLOORS}층 아파트 단지</p>
        ) : (
          <p>
            {countryFlag(viewCountry)} {viewCountryInfo?.nameKo ?? viewCountry}
            {browseTarget && ` · ${browseTarget.displayName}의 집`}
          </p>
        )}
      </div>

      {isOwnApt && isLoggedIn && onDoorToggle && (
        <div className="absolute left-3 top-[5.5rem] z-10 w-[min(100%,220px)] pointer-events-auto">
          <AptEntranceDoorToggle doorOpen={doorOpen} onToggle={onDoorToggle} compact />
        </div>
      )}

      {browseTarget && !isOwnApt && (
        <div className="absolute top-[5.5rem] right-3 z-10 max-w-[220px] rounded-xl border border-pink-400/30 bg-black/60 p-3 shadow-xl backdrop-blur-md space-y-2">
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            {browseTarget.displayName} · {browseTarget.homeFloor}층
          </p>
          <p className="text-[10px] text-white/60 leading-snug">
            현관문이 열린 집만 방문할 수 있습니다
          </p>
          <Button asChild size="sm" className="w-full h-8 rounded-lg text-xs gap-1">
            <Link href={`/u/${browseTarget.username}`}>
              프로필 보기
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute top-28 left-1/2 -translate-x-1/2 z-20 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
          {toast}
        </div>
      )}

      {/* Elevator call panel — only way to change floors */}
      <div className="absolute right-3 bottom-24 z-10 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setElevatorOpen((v) => !v)}
          disabled={moving}
          className={cn(
            "flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-white/20 bg-black/55 text-white backdrop-blur-md shadow-xl transition hover:bg-black/70 disabled:opacity-40",
            elevatorOpen && "border-sky-400/50 bg-sky-500/25"
          )}
          aria-label="엘리베이터"
        >
          <ChevronUp className="h-5 w-5" />
          <span className="text-[9px] font-bold">EV</span>
          <ChevronDown className="h-5 w-5" />
        </button>

        {elevatorOpen && (
          <div className="animate-in fade-in slide-in-from-right-2 rounded-2xl border border-white/15 bg-black/75 p-3 backdrop-blur-xl shadow-2xl w-[11rem] space-y-2">
            <p className="text-[10px] font-bold text-white/70 text-center">엘리베이터 호출</p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={floor <= APT_LOBBY_FLOOR || moving}
                onClick={() => goToFloor(floor - 1)}
                className="flex-1 rounded-xl border border-white/15 py-2 text-white/80 hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronDown className="h-5 w-5 mx-auto" />
              </button>
              <button
                type="button"
                disabled={floor >= APT_TOTAL_FLOORS || moving}
                onClick={() => goToFloor(floor + 1)}
                className="flex-1 rounded-xl border border-white/15 py-2 text-white/80 hover:bg-white/10 disabled:opacity-30"
              >
                <ChevronUp className="h-5 w-5 mx-auto" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                disabled={moving}
                onClick={() => goToFloor(APT_LOBBY_FLOOR)}
                className="rounded-lg border border-white/10 py-1.5 text-[9px] font-bold text-white/70 hover:bg-white/10 disabled:opacity-30"
              >
                로비
              </button>
              <button
                type="button"
                disabled={moving}
                onClick={() => goToFloor(APT_PENTHOUSE_FLOOR)}
                className="rounded-lg border border-white/10 py-1.5 text-[9px] font-bold text-white/70 hover:bg-white/10 disabled:opacity-30"
              >
                PH
              </button>
              {isOwnApt && isLoggedIn && (
                <button
                  type="button"
                  disabled={moving}
                  onClick={() => goToFloor(homeFloor)}
                  className="col-span-2 rounded-lg border border-pink-400/30 py-1.5 text-[9px] font-bold text-pink-200 hover:bg-pink-500/15 disabled:opacity-30"
                >
                  내 집 ({homeFloor}층)
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Country picker */}
      <div className="absolute left-3 bottom-24 z-10">
        <div className="relative">
          <button
            type="button"
            onClick={() => setCountryOpen((v) => !v)}
            className={cn(
              "flex items-center gap-2 rounded-2xl border border-white/20 bg-black/55 px-3 py-2 text-white backdrop-blur-md shadow-xl transition hover:bg-black/70",
              countryOpen && "border-sky-400/50"
            )}
          >
            <Globe2 className="h-4 w-4" />
            <span className="text-lg">{countryFlag(viewCountry)}</span>
          </button>

          {countryOpen && (
            <div className="absolute bottom-full left-0 mb-2 max-h-52 w-48 overflow-y-auto rounded-xl border border-white/15 bg-black/80 shadow-2xl backdrop-blur-xl">
              {WORLD_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setViewCountry(c.code);
                    setCountryOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-white/80 hover:bg-white/10",
                    viewCountry === c.code && "bg-sky-500/20 font-bold text-white"
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
          <button
            type="button"
            onClick={() => {
              setViewCountry(homeCountry);
              setBrowseTarget(null);
              goToFloor(homeFloor);
            }}
            className="mt-2 flex items-center gap-1 rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-[10px] font-bold text-white/80 backdrop-blur-md shadow-lg hover:bg-black/70"
          >
            <Home className="h-3 w-3" />
            내 아파트
          </button>
        )}

        {!isOwnApt && countryApts.length > 0 && (
          <div className="mt-2 max-h-28 w-48 overflow-y-auto rounded-xl border border-white/10 bg-black/60 backdrop-blur-md">
            {loadingCountry && <p className="p-2 text-[9px] text-white/50">불러오는 중…</p>}
            {countryApts.map((apt) => (
              <button
                key={apt.userId}
                type="button"
                onClick={() => setBrowseTarget(apt)}
                className={cn(
                  "w-full px-2 py-1.5 text-left text-[9px] truncate text-white/70 hover:bg-white/10",
                  browseTarget?.userId === apt.userId && "bg-pink-500/20 text-pink-200 font-bold"
                )}
              >
                {apt.displayName} · {apt.homeFloor}층
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
        <p className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] text-white/50 backdrop-blur-sm">
          현관문 열린 집만 방문 · 엘리베이터로 층 이동 · 현관 클릭으로 입장
        </p>
      </div>
    </div>
  );
});
