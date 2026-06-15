"use client";

import { useEffect, useRef, useState } from "react";
import type { ParkingInput } from "@/lib/minigames/parking-rush-logic";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
  onInput: (input: ParkingInput) => void;
};

const KEYS = {
  forward: ["w", "arrowup"],
  back: ["s", "arrowdown"],
  left: ["a", "arrowleft"],
  right: ["d", "arrowright"],
};

export function ParkingRushControls({ disabled, onInput }: Props) {
  const held = useRef({ forward: false, back: false, left: false, right: false, handbrake: false });
  const steerRef = useRef(0);
  const [mobileSteer, setMobileSteer] = useState(0);
  const [accel, setAccel] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [handbrake, setHandbrake] = useState(false);

  useEffect(() => {
    if (disabled) return;
    function down(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (KEYS.forward.includes(k)) held.current.forward = true;
      if (KEYS.back.includes(k)) held.current.back = true;
      if (KEYS.left.includes(k)) held.current.left = true;
      if (KEYS.right.includes(k)) held.current.right = true;
      if (k === " ") {
        held.current.handbrake = true;
        e.preventDefault();
      }
    }
    function up(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (KEYS.forward.includes(k)) held.current.forward = false;
      if (KEYS.back.includes(k)) held.current.back = false;
      if (KEYS.left.includes(k)) held.current.left = false;
      if (KEYS.right.includes(k)) held.current.right = false;
      if (k === " ") held.current.handbrake = false;
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [disabled]);

  useEffect(() => {
    if (disabled) return;
    const id = setInterval(() => {
      let steer = 0;
      if (held.current.left) steer -= 1;
      if (held.current.right) steer += 1;
      steer = steer || mobileSteer;

      let throttle = 0;
      if (held.current.forward) throttle = 1;
      else if (held.current.back) throttle = -1;
      else if (reverse) throttle = -0.85;
      else throttle = accel;

      const hb = held.current.handbrake || handbrake;
      steerRef.current += (steer - steerRef.current) * 0.35;
      onInput({ throttle, steer: steerRef.current, handbrake: hb });
    }, 50);
    return () => clearInterval(id);
  }, [disabled, onInput, mobileSteer, accel, reverse, handbrake]);

  return (
    <>
      <p className="hidden sm:block text-center text-[11px] text-muted-foreground">
        PC: W 가속 · S 브레이크/후진 · A/D 조향 · Space 핸드브레이크
      </p>
      <div className="sm:hidden grid grid-cols-3 gap-2 select-none touch-none">
        <div className="col-span-2 flex items-center justify-center">
          <div
            className="relative w-full max-w-[200px] h-24 rounded-2xl border border-white/20 bg-black/40"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              setMobileSteer((x - 0.5) * 2);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              setMobileSteer(Math.max(-1, Math.min(1, (x - 0.5) * 2)));
            }}
            onPointerUp={() => setMobileSteer(0)}
            onPointerLeave={() => setMobileSteer(0)}
          >
            <div
              className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-violet-500/80 border-2 border-white/40"
              style={{ left: `calc(${((mobileSteer + 1) / 2) * 100}% - 20px)` }}
            />
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/50">핸들</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-xl font-bold text-sm border",
              accel > 0 ? "bg-emerald-600 border-emerald-400" : "bg-black/40 border-white/20"
            )}
            onPointerDown={() => setAccel(1)}
            onPointerUp={() => setAccel(0)}
            onPointerLeave={() => setAccel(0)}
          >
            가속
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg py-2 text-xs border",
              reverse ? "bg-amber-600 border-amber-400" : "bg-black/40 border-white/20"
            )}
            onPointerDown={() => setReverse(true)}
            onPointerUp={() => setReverse(false)}
          >
            후진
          </button>
          <button
            type="button"
            className={cn(
              "rounded-lg py-2 text-xs border",
              handbrake ? "bg-red-700 border-red-400" : "bg-black/40 border-white/20"
            )}
            onPointerDown={() => setHandbrake(true)}
            onPointerUp={() => setHandbrake(false)}
          >
            🅿️ HB
          </button>
        </div>
      </div>
    </>
  );
}
