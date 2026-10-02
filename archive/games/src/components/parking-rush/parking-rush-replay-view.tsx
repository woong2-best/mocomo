"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  frameIndexAtTime,
  levelFromInitialState,
  maxReplayTimeMs,
  parseParkingFrames,
} from "@/lib/minigames/parking-rush-replay";
import { ParkingRushScene, type SceneCar } from "@/lib/minigames/parking-rush-scene";

type Props = {
  moves: unknown[];
  initialState?: Record<string, unknown> | null;
  playerNames?: Record<string, string>;
};

export function ParkingRushReplayView({ moves, initialState, playerNames }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ParkingRushScene | null>(null);
  const frames = useMemo(() => parseParkingFrames(moves), [moves]);
  const level = useMemo(() => levelFromInitialState(initialState), [initialState]);
  const maxT = maxReplayTimeMs(frames);
  const [tMs, setTMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const scene = new ParkingRushScene(el);
    scene.setFreeCamera(true);
    sceneRef.current = scene;
    if (level) scene.loadLevel(level);
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [level]);

  useEffect(() => {
    if (!playing || !frames.length) return;
    const id = setInterval(() => {
      setTMs((prev) => {
        const next = prev + 100 * speed;
        if (next >= maxT) {
          setPlaying(false);
          return maxT;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [playing, speed, maxT, frames.length]);

  useEffect(() => {
    const scene = sceneRef.current;
    const frame = frames[frameIndexAtTime(frames, tMs)];
    if (!scene || !frame) return;
    const cars: SceneCar[] = Object.entries(frame.cars).map(([userId, c]) => ({
      userId,
      car: { x: c.x, y: c.y, angle: c.angle, speed: c.speed, steer: 0, vehicleId: c.vehicleId },
      vehicleId: c.vehicleId,
      color: c.color,
      isLocal: false,
      blinker: c.blinker,
    }));
    scene.updateCars(cars);
  }, [frames, tMs]);

  if (!level) {
    return <p className="text-sm text-muted-foreground text-center">리플레이 맵 데이터 없음</p>;
  }
  if (!frames.length) {
    return <p className="text-sm text-muted-foreground text-center">주행 기록 프레임 없음</p>;
  }

  return (
    <div className="space-y-3">
      <div ref={mountRef} className="w-full aspect-[4/3] min-h-[280px] rounded-xl overflow-hidden border border-cyan-500/20 bg-black" />
      <input
        type="range"
        min={0}
        max={maxT}
        value={tMs}
        onChange={(e) => setTMs(Number(e.target.value))}
        className="w-full"
      />
      <p className="text-xs text-center text-muted-foreground">
        {(tMs / 1000).toFixed(1)}s / {(maxT / 1000).toFixed(1)}s
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={() => setTMs(0)}>
          처음
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPlaying((p) => !p)}>
          {playing ? "일시정지" : "재생"}
        </Button>
        <select className="text-xs border rounded-lg px-2 py-1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={4}>4x</option>
        </select>
      </div>
      <p className="text-[11px] text-center text-muted-foreground">
        자유 시점 · 드래그로 카메라 회전 · {Object.keys(playerNames ?? {}).length || "?"}명 주행
      </p>
    </div>
  );
}
