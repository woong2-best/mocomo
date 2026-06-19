"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MoveInEntryScene,
  MOVE_IN_PHASE_LABEL,
  type MoveInPhase,
} from "@/lib/apt/bondee/move-in-entry-scene";
import { APT_PENTHOUSE_FLOOR } from "@/lib/apt/constants";
import { cn } from "@/lib/utils";

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
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("walk-in");
    setDisplayFloor(1);
    setDone(false);
  }, [open, homeFloor]);

  useEffect(() => {
    if (!open) return;
    const el = mountRef.current;
    if (!el) return;

    const scene = new MoveInEntryScene(el, homeFloor);
    scene.setCallbacks({
      onPhaseChange: setPhase,
      onFloorDisplay: setDisplayFloor,
      onComplete: () => setDone(true),
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [open, homeFloor]);

  if (!open) return null;

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
          <p className="text-sm text-muted-foreground animate-pulse">{MOVE_IN_PHASE_LABEL[phase]}</p>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-8">
        {phase === "elevator-ride" && (
          <div
            className={cn(
              "rounded-2xl border-[3px] border-pink-200 bg-white/95 px-6 py-3 shadow-lg",
              "font-display text-4xl font-bold tabular-nums text-folk-terracotta transition-transform"
            )}
          >
            {displayFloor}
            <span className="text-lg ml-1 text-muted-foreground">층</span>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-neutral-200 bg-white/95 backdrop-blur-md px-4 py-4 space-y-3">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className={cn(phase === "walk-in" && "text-folk-terracotta font-bold")}>입구</span>
          <span>→</span>
          <span className={cn(phase === "elevator-ride" && "text-folk-terracotta font-bold")}>엘리베이터</span>
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
          <p className="text-center text-[10px] text-muted-foreground">기본 아바타가 새 집으로 이동 중입니다…</p>
        )}
      </div>
    </div>
  );
}
