"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Building2, DoorClosed, DoorOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MoveInEntryScene,
  MOVE_IN_PHASE_LABEL,
  type MoveInPhase,
} from "@/lib/apt/bondee/move-in-entry-scene";
import { APT_PENTHOUSE_FLOOR } from "@/lib/apt/constants";
import { cn } from "@/lib/utils";

const ELEVATOR_PHASES: MoveInPhase[] = [
  "doors-opening-lobby",
  "enter-elevator",
  "doors-closing",
  "elevator-ride",
  "doors-opening",
  "exit-elevator",
];

export function AptMoveInAnimation({
  open,
  username,
  regionLabel,
  homeFloor,
  onComplete,
}: {
  open: boolean;
  username: string;
  regionLabel: string;
  homeFloor: number;
  onComplete: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MoveInEntryScene | null>(null);
  const [phase, setPhase] = useState<MoveInPhase>("walk-in");
  const [displayFloor, setDisplayFloor] = useState(1);
  const [doorClosed, setDoorClosed] = useState(1);
  const [floorPulse, setFloorPulse] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("walk-in");
    setDisplayFloor(1);
    setDoorClosed(1);
    setFloorPulse(0);
    setDone(false);
  }, [open, homeFloor]);

  useEffect(() => {
    if (!open) return;
    setFloorPulse((n) => n + 1);
  }, [open, displayFloor]);

  useEffect(() => {
    if (!open) return;
    const el = mountRef.current;
    if (!el) return;

    const scene = new MoveInEntryScene(el, homeFloor);
    scene.setCallbacks({
      onPhaseChange: setPhase,
      onFloorDisplay: setDisplayFloor,
      onDoorProgress: setDoorClosed,
      onComplete: () => setDone(true),
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [open, homeFloor]);

  if (!open) return null;

  const inElevator = ELEVATOR_PHASES.includes(phase);
  const doorsOpen = doorClosed < 0.35;
  const rideProgress =
    phase === "elevator-ride"
      ? Math.min(100, Math.round(((displayFloor - 1) / Math.max(1, homeFloor - 1)) * 100))
      : phase === "doors-opening" || phase === "exit-elevator" || phase === "to-home" || phase === "done"
        ? 100
        : 0;

  return (
    <div className="fixed inset-0 z-[60] bg-[#fef6f8] flex flex-col">
      <div ref={mountRef} className="relative flex-1 min-h-0" />

      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-white/90 to-transparent px-4 pt-4 pb-12">
        <div className="mx-auto max-w-lg text-center space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-folk-terracotta">APT 입주</p>
          <h2 className="text-lg font-bold text-folk-cobalt">
            {username}님, {regionLabel} {homeFloor}층
            {homeFloor === APT_PENTHOUSE_FLOOR ? " (PH)" : ""}
          </h2>
          <p className="text-sm text-muted-foreground">{MOVE_IN_PHASE_LABEL[phase]}</p>
        </div>
      </div>

      {inElevator && (
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-2">
          <div className="rounded-xl border-2 border-pink-200 bg-white/95 px-3 py-2 shadow-md">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
              {doorsOpen ? (
                <DoorOpen className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <DoorClosed className="h-3.5 w-3.5 text-folk-terracotta" />
              )}
              {doorsOpen ? "문 열림" : "문 닫힘"}
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2">
        {inElevator && (
          <div className="flex flex-col items-center gap-3">
            <div
              key={floorPulse}
              className={cn(
                "rounded-2xl border-[3px] border-pink-200 bg-neutral-900 px-7 py-4 shadow-xl",
                "font-display text-5xl font-bold tabular-nums text-emerald-400",
                "animate-in zoom-in-95 duration-150"
              )}
            >
              {displayFloor}
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-folk-cobalt/80">
              <ArrowUp className={cn("h-3.5 w-3.5", phase === "elevator-ride" && "animate-bounce")} />
              {homeFloor}층까지
            </div>
            {phase === "elevator-ride" && (
              <div className="w-40 h-1.5 rounded-full bg-pink-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-folk-terracotta transition-[width] duration-150"
                  style={{ width: `${rideProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3">
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className={cn(phase === "walk-in" && "text-folk-terracotta font-bold")}>입구</span>
          <span>→</span>
          <span
            className={cn(
              inElevator && "text-folk-terracotta font-bold"
            )}
          >
            엘리베이터
          </span>
          <span>→</span>
          <span className={cn((phase === "to-home" || phase === "done") && "text-folk-terracotta font-bold")}>
            {homeFloor}층
          </span>
        </div>

        {done ? (
          <div className="max-w-md mx-auto space-y-3 text-center">
            <p className="text-sm text-folk-cobalt flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-folk-terracotta" />
              입주가 완료되었습니다!
            </p>
            <Button className="w-full rounded-xl gap-2" onClick={onComplete}>
              <Building2 className="h-4 w-4" />
              내 아파트로 가기
            </Button>
          </div>
        ) : (
          <p className="text-center text-[10px] text-muted-foreground">
            {inElevator
              ? `${displayFloor}층 · ${doorsOpen ? "문 열림" : "상승 중"}`
              : "기본 아바타가 새 집으로 이동 중입니다…"}
          </p>
        )}
      </div>
    </div>
  );
}
