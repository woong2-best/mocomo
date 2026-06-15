"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Car, Crown, MapPin, Pin, RotateCcw, Timer, Trophy, Users, ZoomIn, ZoomOut } from "lucide-react";
import { ParkingRushControls } from "@/components/parking-rush/parking-rush-controls";
import { Button } from "@/components/ui/button";
import {
  MAP_TYPE_LABELS,
  MODE_LABELS,
  RANK_TIER_LABELS,
  VEHICLE_SPECS,
  isParkingInstantPlayMode,
  type ParkingInput,
  type ParkingRushMode,
  type RankTier,
  type VehicleTypeId,
} from "@/lib/minigames/parking-rush-logic";
import { ParkingRushScene, type SceneCar } from "@/lib/minigames/parking-rush-scene";
import type { CarState } from "@/lib/minigames/parking-rush-logic";
import type { MinigamePlayerPublic } from "@/lib/minigames/shared-types";
import { cn } from "@/lib/utils";

export type ParkingRushPlayerStats = {
  vehicleId: VehicleTypeId;
  carColor?: string;
  blinker?: ParkingInput["blinker"];
  hornActive?: boolean;
  car: CarState;
  spotId: string;
  score: number;
  collisions: number;
  parked: boolean;
  parkProgress: number;
  rank: number | null;
  tier: RankTier;
  finished: boolean;
  combo: number;
  lastCollision: { strength: string } | null;
};

type Props = {
  levelName: string;
  mapType: string;
  difficulty: string;
  mode: ParkingRushMode;
  phase: "countdown" | "playing" | "finished";
  startedAt: number;
  timeLeftMs: number;
  walls: unknown[];
  obstacles: unknown[];
  parkingSpots: unknown[];
  bounds?: { x: number; y: number; w: number; h: number };
  groundColor: string;
  accentColor: string;
  stats: Record<string, ParkingRushPlayerStats>;
  playerOrder: string[];
  finishOrder: string[];
  userId?: string;
  isSpectator: boolean;
  finished?: boolean;
  players: MinigamePlayerPublic[];
  onMove: (move: ParkingInput) => Promise<boolean>;
};

function playerName(players: MinigamePlayerPublic[], id: string) {
  return players.find((p) => p.userId === id)?.username ?? "플레이어";
}

export function ParkingRushGamePanel({
  levelName,
  mapType,
  difficulty,
  mode,
  phase,
  startedAt,
  timeLeftMs,
  walls,
  obstacles,
  parkingSpots,
  bounds,
  groundColor,
  accentColor,
  stats,
  playerOrder,
  finishOrder,
  userId,
  isSpectator,
  finished,
  players,
  onMove,
}: Props) {
  const canvasMount = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ParkingRushScene | null>(null);
  const levelLoaded = useRef(false);
  const myStats = userId ? stats[userId] : undefined;
  const instantPlay = isParkingInstantPlayMode(mode);
  const canDrive = !isSpectator && !finished && phase === "playing" && !!myStats && !myStats.finished;

  const [countdown, setCountdown] = useState<number | null>(null);
  const [pinning, setPinning] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [collisionFlash, setCollisionFlash] = useState(false);
  const lastCollisionRef = useRef<string | null>(null);

  const speedKmh = myStats
    ? Math.round(Math.abs(myStats.car.speed) * (80 / 12))
    : 0;
  const themeNeon =
    mapType === "parking_lot"
      ? "#facc15"
      : mapType === "underground" || mapType === "rooftop"
        ? "#fbbf24"
        : mapType === "mart" || mapType === "airport"
          ? "#a78bfa"
          : mapType === "harbor"
            ? "#38bdf8"
            : "#22d3ee";
  const isUsLot = mapType === "parking_lot";

  const pinShowcase = useCallback(async () => {
    if (!myStats) return;
    setPinning(true);
    try {
      const res = await fetch("/api/minigames/parking-rush/showcase", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: myStats.vehicleId,
          carColor: myStats.carColor,
          tier: myStats.tier,
          score: myStats.score,
          levelName,
          parked: myStats.parked,
        }),
      });
      if (res.ok) setPinned(true);
    } finally {
      setPinning(false);
    }
  }, [myStats, levelName]);

  useEffect(() => {
    if (instantPlay || phase !== "countdown") {
      setCountdown(null);
      return;
    }
    const tick = () => setCountdown(Math.max(0, Math.ceil((startedAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [phase, startedAt, instantPlay]);

  useEffect(() => {
    const el = canvasMount.current;
    if (!el) return;
    const scene = new ParkingRushScene(el);
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
      levelLoaded.current = false;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || levelLoaded.current) return;
    if (!walls.length) return;
    scene.loadLevel(
      {
        id: "",
        name: levelName,
        mapType: mapType as "parking_lot",
        difficulty: difficulty as "beginner",
        timeLimitMs: 120000,
        bounds: bounds ?? { x: 0, y: 0, w: 42, h: 58 },
        walls: walls as never[],
        obstacles: obstacles as never[],
        parkingSpots: parkingSpots as never[],
        spawnPoints: [],
        groundColor,
        accentColor,
      },
      myStats?.spotId
    );
    levelLoaded.current = true;
  }, [walls, obstacles, parkingSpots, levelName, mapType, difficulty, groundColor, accentColor, myStats?.spotId, bounds]);

  useEffect(() => {
    if (isSpectator || !canDrive) return;
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "c") {
        sceneRef.current?.resetCamera();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSpectator, canDrive]);

  useEffect(() => {
    const cars: SceneCar[] = playerOrder
      .filter((id) => stats[id])
      .map((id) => ({
        userId: id,
        car: stats[id]!.car,
        vehicleId: stats[id]!.vehicleId,
        color: stats[id]!.carColor,
        isLocal: id === userId,
        parked: stats[id]!.parked,
        spotId: stats[id]!.spotId,
        blinker: stats[id]!.blinker,
        hornActive: stats[id]!.hornActive,
      }));
    sceneRef.current?.updateCars(cars);
  }, [stats, playerOrder, userId]);

  useEffect(() => {
    sceneRef.current?.setLocalUser(isSpectator ? null : userId ?? null);
    sceneRef.current?.setFreeCamera(!!isSpectator);
  }, [userId, isSpectator]);

  useEffect(() => {
    const hit = myStats?.lastCollision;
    if (!hit) return;
    const key = `${hit.strength}-${myStats?.collisions ?? 0}`;
    if (lastCollisionRef.current === key) return;
    lastCollisionRef.current = key;
    sceneRef.current?.setCollisionShake(hit.strength === "heavy" ? 0.55 : 0.3);
    setCollisionFlash(true);
    const id = window.setTimeout(() => setCollisionFlash(false), 180);
    return () => window.clearTimeout(id);
  }, [myStats?.lastCollision, myStats?.collisions]);

  const sendInput = useCallback(
    (input: ParkingInput) => {
      if (!canDrive) return;
      void onMove(input);
    },
    [canDrive, onMove]
  );

  const opponents = players.filter((p) => p.userId !== userId);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 space-y-2",
          isUsLot
            ? "border-amber-400/30 bg-gradient-to-br from-sky-950/50 via-stone-900/60 to-amber-950/30"
            : "border-cyan-500/30 bg-gradient-to-br from-slate-950/80 via-cyan-950/20 to-black/60"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <Car className={cn("h-5 w-5 shrink-0 mt-0.5", isUsLot ? "text-amber-300" : "text-cyan-300")} />
            <div className="min-w-0">
              <p className="font-bold text-cyan-50 truncate">{levelName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {MAP_TYPE_LABELS[mapType as keyof typeof MAP_TYPE_LABELS] ?? mapType} · {difficulty} ·{" "}
                {MODE_LABELS[mode]}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "rounded-lg px-2 py-1 text-xs font-bold border",
              isUsLot ? "bg-amber-500/25 text-amber-100 border-amber-400/35" : "bg-cyan-600/30 text-cyan-100 border-cyan-400/30"
            )}
          >
            {isUsLot ? "US Mega Lot" : "주차 러쉬"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1 text-cyan-200">
            <Timer className="h-4 w-4" />
            {finished ? "종료" : phase === "countdown" && !instantPlay ? "준비…" : `${Math.ceil(timeLeftMs / 1000)}초`}
          </span>
          {myStats && (
            <>
              <span className="font-black text-yellow-300 tabular-nums">{myStats.score.toLocaleString()}</span>
              <span className="text-emerald-400">{myStats.combo}c</span>
              <span className="text-red-400">충돌 {myStats.collisions}</span>
              <span className="text-violet-300">{RANK_TIER_LABELS[myStats.tier]}</span>
              {myStats.parked && (
                <span className="text-green-400 font-bold inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> 주차 완료
                </span>
              )}
            </>
          )}
        </div>

        {myStats && phase === "playing" && !myStats.parked && (
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-300 transition-all"
              style={{ width: `${myStats.parkProgress * 100}%` }}
            />
          </div>
        )}

        {mode !== "solo" && opponents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {opponents.map((p) => {
              const st = stats[p.userId];
              if (!st) return null;
              return (
                <div key={p.userId} className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs">
                  <span className="font-semibold">{playerName(players, p.userId)}</span>
                  <span className="ml-2 text-yellow-200">{st.score}</span>
                  {st.parked && <span className="ml-1 text-green-400">✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isSpectator ? (
        <p className="text-center text-xs text-muted-foreground inline-flex items-center justify-center gap-1">
          <Users className="h-3 w-3" /> 관전 중 · 마우스 드래그로 자유 시점
        </p>
      ) : canDrive ? (
        <p className="text-center text-[11px] text-amber-200/70">
          3D 화면을 드래그하면 자유 각도 시점 · <kbd className="px-1 rounded bg-black/40 border border-white/15">C</kbd> 추적 카메라 복귀
        </p>
      ) : null}

      <div
        className="relative rounded-2xl overflow-hidden border-2 shadow-2xl bg-black"
        style={{
          borderColor: `${themeNeon}55`,
          boxShadow: `0 0 40px ${themeNeon}22, 0 20px 50px rgba(0,0,0,0.5)`,
        }}
      >
        <div ref={canvasMount} className="w-full aspect-[4/3] min-h-[280px]" />
        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{
            background: `radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[5] opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)",
          }}
        />

        {!isSpectator && canDrive && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-end gap-3">
            <div
              className="rounded-xl border px-3 py-2 backdrop-blur-md bg-black/50"
              style={{ borderColor: `${themeNeon}66` }}
            >
              <p className="text-[10px] uppercase tracking-widest text-white/60">SPEED</p>
              <p className="text-3xl font-black tabular-nums leading-none" style={{ color: themeNeon }}>
                {speedKmh}
                <span className="text-sm font-bold text-white/50 ml-0.5">km/h</span>
              </p>
            </div>
            {myStats && (
              <div className="rounded-xl border border-white/15 px-2 py-1.5 backdrop-blur-md bg-black/40 text-[10px] text-white/70">
                <span className={myStats.car.speed < -0.1 ? "text-amber-300 font-bold" : "text-emerald-300 font-bold"}>
                  {myStats.car.speed < -0.1 ? "R" : "D"}
                </span>
                <span className="mx-1">·</span>
                <span>{Math.round(myStats.parkProgress * 100)}%</span>
              </div>
            )}
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {!isSpectator && canDrive && (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-black/50"
              title="카메라 리셋 (C)"
              onClick={() => sceneRef.current?.resetCamera()}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-black/50"
            onClick={() => sceneRef.current?.setZoom(-0.1)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 bg-black/50"
            onClick={() => sceneRef.current?.setZoom(0.1)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
        {phase === "countdown" && !instantPlay && countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
            <span className="text-7xl font-black text-white tabular-nums animate-[pianoCountPop_0.55s_ease-out]">
              {countdown > 0 ? countdown : "GO!"}
            </span>
          </div>
        )}
        {collisionFlash && (
          <div className="absolute inset-0 z-[15] bg-red-500/25 mix-blend-screen pointer-events-none animate-pulse" />
        )}
        {myStats?.lastCollision && collisionFlash && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[16] px-3 py-1 rounded-full bg-red-600/90 text-xs font-bold text-white border border-red-300/50">
            {myStats.lastCollision.strength === "heavy" ? "강한 충돌!" : "충돌"}
          </div>
        )}
      </div>

      {!isSpectator && (
        <ParkingRushControls disabled={!canDrive} onInput={sendInput} />
      )}

      {myStats && (
        <p className="text-center text-xs text-muted-foreground">
          {VEHICLE_SPECS[myStats.vehicleId].label} · 목표 #{myStats.spotId.replace("spot-", "")}
          {myStats.blinker && myStats.blinker !== "off" ? ` · ${myStats.blinker === "hazard" ? "비상등" : "방향지시"}` : ""}
        </p>
      )}

      {finished && userId && myStats && (
        <div className="rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 to-black/60 p-5 text-center space-y-2">
          <Crown className="h-8 w-8 mx-auto text-yellow-400" />
          <p className="font-black text-2xl text-yellow-100">{myStats.score.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            {myStats.parked ? "주차 성공" : "시간 종료"} · {RANK_TIER_LABELS[myStats.tier]} · 충돌{" "}
            {myStats.collisions}회
          </p>
          {myStats.rank && (
            <p className="text-cyan-300 inline-flex items-center justify-center gap-1">
              <Trophy className="h-4 w-4" /> {myStats.rank}위
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl border-cyan-500/40"
            disabled={pinning || pinned}
            onClick={() => void pinShowcase()}
          >
            <Pin className="h-3.5 w-3.5 mr-1" />
            {pinned ? "프로필에 전시됨" : pinning ? "저장 중…" : "프로필에 전시"}
          </Button>
        </div>
      )}

      {finishOrder.length > 1 && phase === "playing" && (
        <div className="text-center text-xs text-cyan-300/80">실시간 순위 · 서버 권한 판정</div>
      )}
    </div>
  );
}
