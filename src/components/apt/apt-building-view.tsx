"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  ChevronDown,
  ChevronUp,
  Combine,
  Globe2,
  Home,
  Plus,
  RotateCcw,
  SplitSquareHorizontal,
  Trash2,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AptProfileDto, CountryAptPreview } from "@/actions/apt";
import { listCountryApartments, placeAptTv, saveAptFloorPlan } from "@/actions/apt";
import { AptSimulationHud } from "@/components/apt/apt-simulation-hud";
import {
  APT_DEFAULT_FLOOR,
  APT_TOTAL_FLOORS,
  DollhouseBuildingScene,
} from "@/lib/apt/building-scene";
import {
  addRoom,
  canMerge,
  createDefaultFloorPlan,
  mergeRooms,
  removeRoom,
  splitRoom,
} from "@/lib/apt/floor-plan-logic";
import { getRoomsForFloor } from "@/lib/apt/floor-plan-store";
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

export function AptBuildingView({
  initialProfile,
  bondeeRoom,
  isLoggedIn,
}: {
  initialProfile: AptProfileDto | null;
  bondeeRoom: BondeeRoomState;
  isLoggedIn: boolean;
}) {
  const homeCountry = initialProfile?.countryCode ?? "KR";
  const homeFloor = initialProfile?.homeFloor ?? APT_DEFAULT_FLOOR;
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<DollhouseBuildingScene | null>(null);
  const floorRef = useRef(homeFloor);
  const xrayRef = useRef(false);
  const simReadyRef = useRef(false);
  const plansRef = useRef<Record<number, AptRoom[]>>(initPlansFromProfile(initialProfile));

  const [floor, setFloor] = useState(homeFloor);
  const [xray, setXray] = useState(true);
  const [moving, setMoving] = useState(false);
  const [plans, setPlans] = useState(() => initPlansFromProfile(initialProfile));
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [simSnap, setSimSnap] = useState<SimulationSnapshot | null>(null);
  const [viewCountry, setViewCountry] = useState(homeCountry);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryApts, setCountryApts] = useState<CountryAptPreview[]>([]);
  const [browseTarget, setBrowseTarget] = useState<CountryAptPreview | null>(null);
  const [loadingCountry, setLoadingCountry] = useState(false);

  const isOwnApt = viewCountry === homeCountry && !browseTarget;
  const viewCountryInfo = findCountry(viewCountry);

  const displayPlans = useMemo(() => {
    if (isOwnApt) return plans;
    if (browseTarget) return browseTarget.floorPlans;
    return {};
  }, [isOwnApt, plans, browseTarget]);

  const rooms = getRoomsForFloor(plans, floor);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const setRooms = useCallback(
    (next: AptRoom[]) => {
      if (!isOwnApt) return;
      plansRef.current = { ...plansRef.current, [floor]: next };
      setPlans((p) => ({ ...p, [floor]: next }));
      sceneRef.current?.updateFloorRooms(floor, next);
      if (isLoggedIn) void saveAptFloorPlan(floor, next);
    },
    [floor, isLoggedIn, isOwnApt]
  );

  const goToFloor = useCallback((next: number) => {
    const clamped = Math.min(APT_TOTAL_FLOORS, Math.max(1, next));
    if (clamped === floorRef.current) return;
    floorRef.current = clamped;
    setFloor(clamped);
    setSelected([]);
    setMoving(true);
    sceneRef.current?.setFloor(clamped);
    sceneRef.current?.setSelectedRoomIds([]);
    sceneRef.current?.setXray(true);
    window.setTimeout(() => {
      setMoving(false);
      sceneRef.current?.setXray(xrayRef.current);
    }, 520);
  }, []);

  useEffect(() => {
    xrayRef.current = xray;
    if (!moving) sceneRef.current?.setXray(xray);
  }, [xray, moving]);

  useEffect(() => {
    sceneRef.current?.setSelectedRoomIds(selected);
  }, [selected]);

  useEffect(() => {
    void (async () => {
      setLoadingCountry(true);
      try {
        const list = await listCountryApartments(viewCountry);
        setCountryApts(list);
        setBrowseTarget(null);
      } finally {
        setLoadingCountry(false);
      }
    })();
  }, [viewCountry]);

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

    const scene = new DollhouseBuildingScene(el);
    scene.setCallbacks({
      onFloorClick: (f) => goToFloor(f),
      onRoomClick: (id, multi) => {
        setSelected((prev) => {
          if (multi) return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
          return [id];
        });
      },
      onSimulationChange: (snap) => setSimSnap(snap),
    });
    sceneRef.current = scene;
    scene.setFloorPlans(plansRef.current);
    scene.setFloor(homeFloor);
    scene.setBondeeRoom(bondeeRoom);

    if (isLoggedIn && initialProfile?.moveInCompleted && isOwnApt) {
      void scene.startSimulation(homeFloor, initialProfile.residents, initialProfile.furniture);
      simReadyRef.current = true;
    }

    return () => {
      scene.dispose();
      sceneRef.current = null;
      simReadyRef.current = false;
    };
  }, [bondeeRoom, goToFloor, homeFloor, initialProfile, isLoggedIn, isOwnApt]);

  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);

  const mergeable = useMemo(() => {
    if (selected.length !== 2) return false;
    const ra = rooms.find((r) => r.id === selected[0]);
    const rb = rooms.find((r) => r.id === selected[1]);
    return !!(ra && rb && canMerge(ra, rb));
  }, [selected, rooms]);

  const selectedFlexible = selected.filter((id) => !rooms.find((r) => r.id === id)?.locked);

  const handleRemove = () => {
    if (selectedFlexible.length !== 1) return;
    const next = removeRoom(rooms, selectedFlexible[0]);
    if (!next) return showToast("고정 공간은 삭제할 수 없습니다");
    setRooms(next);
    setSelected([]);
    showToast("방을 삭제했습니다");
  };

  const handleMerge = () => {
    if (!mergeable) return;
    const next = mergeRooms(rooms, selected[0], selected[1]);
    if (!next) return showToast("인접한 방만 합칠 수 있습니다");
    setRooms(next);
    setSelected([]);
    showToast("방을 합쳤습니다");
  };

  const handleSplit = () => {
    if (selectedFlexible.length !== 1) return;
    const next = splitRoom(rooms, selectedFlexible[0]);
    if (!next) return showToast("이 방은 더 나눌 수 없습니다");
    setRooms(next);
    setSelected([]);
    showToast("방을 분할했습니다");
  };

  const handleAdd = () => {
    const next = addRoom(rooms);
    if (!next) return showToast("추가할 공간이 없습니다");
    setRooms(next);
    showToast("방을 추가했습니다");
  };

  const handleReset = () => {
    const d = createDefaultFloorPlan().rooms;
    setRooms(d.map((r) => ({ ...r })));
    setSelected([]);
    showToast("기본 구조로 초기화했습니다");
  };

  const handlePlaceTv = async () => {
    if (!isLoggedIn) {
      showToast("로그인 후 TV를 설치할 수 있습니다");
      return;
    }
    if (!isOwnApt) {
      showToast("내 아파트에서만 TV를 설치할 수 있습니다");
      return;
    }
    const res = await placeAptTv();
    if ("error" in res && res.error) {
      showToast(res.error);
      return;
    }
    if (res.furniture) {
      sceneRef.current?.setSimulationFurniture(res.furniture);
      showToast("거실에 TV를 설치했습니다");
    }
  };

  const hasTv = initialProfile?.furniture.some((f) => f.type === "tv") ?? simSnap?.furniture.some((f) => f.type === "tv");

  return (
    <div className="folk-card overflow-hidden">
      <div className="flex flex-col lg:flex-row min-h-[min(88dvh,920px)]">
        <div className="relative flex-1 min-h-[560px] bg-[#fef6f8]">
          <div ref={mountRef} className="absolute inset-0" />

          <AptSimulationHud snapshot={simSnap} />

          <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-neutral-200 bg-white/95 px-2.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            {isOwnApt ? (
              <>
                인형의 집 · {floor}층
                {isLoggedIn && initialProfile?.moveInCompleted && floor === homeFloor && (
                  <span className="ml-1 text-folk-terracotta">· 내 집</span>
                )}
              </>
            ) : (
              <>
                {countryFlag(viewCountry)} {viewCountryInfo?.nameKo ?? viewCountry} 둘러보기
                {browseTarget && <span className="ml-1">· {browseTarget.displayName}의 집</span>}
              </>
            )}
          </div>

          <div className="pointer-events-none absolute left-3 bottom-3 rounded-lg border border-pink-100 bg-white/95 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
            휠 확대/축소 · 층 클릭 · 엘리베이터로 이동
          </div>

          {moving && (
            <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center">
              <span className="rounded-full border border-pink-100 bg-white/95 px-3 py-1 text-xs font-semibold text-pink-700 animate-pulse">
                엘리베이터 · {floor}층
              </span>
            </div>
          )}

          {toast && (
            <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 rounded-full border border-neutral-200 bg-white/95 px-4 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm">
              {toast}
            </div>
          )}

          <div className="absolute bottom-3 right-3 left-3 lg:left-auto lg:right-[8.5rem] flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white/95 p-2 shadow-sm backdrop-blur-md">
            {isOwnApt ? (
              <>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs" onClick={handlePlaceTv} disabled={!!hasTv}>
              <Tv className="h-3.5 w-3.5" />
              TV 설치
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs" onClick={handleAdd}>
              <Plus className="h-3.5 w-3.5" />
              방 추가
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs" disabled={selectedFlexible.length !== 1} onClick={handleSplit}>
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
              분할
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs" disabled={!mergeable} onClick={handleMerge}>
              <Combine className="h-3.5 w-3.5" />
              합치기
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 rounded-lg text-xs text-destructive hover:text-destructive" disabled={selectedFlexible.length !== 1} onClick={handleRemove}>
              <Trash2 className="h-3.5 w-3.5" />
              삭제
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1 rounded-lg text-xs" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              초기화
            </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground px-2">다른 유저의 집 내부를 구경할 수 있습니다</p>
            )}
          </div>
        </div>

        <aside className="flex w-full lg:w-[7.5rem] shrink-0 flex-col items-center border-t lg:border-t-0 lg:border-l border-neutral-200 bg-white px-3 py-4 gap-2 relative">
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => setCountryOpen((v) => !v)}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-2 transition-all",
                countryOpen
                  ? "border-folk-terracotta bg-folk-terracotta/10"
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
              {!loadingCountry && countryApts.length === 0 && (
                <p className="text-[9px] text-center text-muted-foreground leading-snug">공개 아파트 없음</p>
              )}
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
              }}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white py-1.5 text-[9px] font-bold text-folk-cobalt hover:bg-neutral-50"
            >
              <Home className="h-3 w-3" />
              내 아파트
            </button>
          )}

          <button
            type="button"
            onClick={() => setXray((v) => !v)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all",
              xray
                ? "border-pink-300 bg-pink-50 text-pink-600 shadow-sm"
                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            )}
            aria-label="단면도 보기"
            title="단면도 보기"
          >
            <Box className="h-5 w-5" strokeWidth={2.25} />
          </button>

          <p className="text-[10px] text-center leading-snug text-muted-foreground px-1">
            {xray ? "인형의 집 단면" : "외관 보기"}
          </p>

          <div className="flex flex-1 flex-col items-center justify-center gap-2 w-full max-w-[4.5rem]">
            <button
              type="button"
              disabled={floor >= APT_TOTAL_FLOORS || moving}
              onClick={() => goToFloor(floor + 1)}
              className={cn(
                "flex h-12 w-full items-center justify-center rounded-xl border-2 border-neutral-200 bg-white text-neutral-700 transition-all",
                "hover:bg-neutral-50 hover:-translate-y-0.5 disabled:opacity-35 disabled:pointer-events-none"
              )}
              aria-label="위층"
            >
              <ChevronUp className="h-7 w-7" strokeWidth={2.5} />
            </button>

            <div
              className={cn(
                "flex h-16 w-full items-center justify-center rounded-xl border-[3px] border-neutral-200 bg-white font-display text-3xl font-bold tabular-nums text-neutral-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.04)] transition-transform duration-300",
                moving && "scale-95"
              )}
            >
              {floor}
            </div>

            <button
              type="button"
              disabled={floor <= 1 || moving}
              onClick={() => goToFloor(floor - 1)}
              className={cn(
                "flex h-12 w-full items-center justify-center rounded-xl border-2 border-neutral-200 bg-white text-neutral-700 transition-all",
                "hover:bg-neutral-50 hover:translate-y-0.5 disabled:opacity-35 disabled:pointer-events-none"
              )}
              aria-label="아래층"
            >
              <ChevronDown className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground tabular-nums">1 – {APT_TOTAL_FLOORS}층</p>
          <input
            type="number"
            min={1}
            max={APT_TOTAL_FLOORS}
            value={floor}
            disabled={moving}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) goToFloor(n);
            }}
            className="w-full rounded-lg border border-neutral-200 bg-white px-1 py-1 text-center text-xs font-bold tabular-nums disabled:opacity-40"
            aria-label="층 직접 이동"
          />
          <p className="text-[9px] text-center text-muted-foreground leading-snug px-1">
            층을 클릭하거나 엘리베이터로 이동
          </p>
        </aside>
      </div>
    </div>
  );
}
