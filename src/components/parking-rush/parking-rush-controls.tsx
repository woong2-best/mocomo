"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Volume2 } from "lucide-react";
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
  const held = useRef({ forward: false, back: false, left: false, right: false, handbrake: false, horn: false });
  const steerRef = useRef(0);
  const [mobileSteer, setMobileSteer] = useState(0);
  const [accel, setAccel] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [handbrake, setHandbrake] = useState(false);
  const [blinker, setBlinker] = useState<ParkingInput["blinker"]>("off");

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
      if (k === "h") held.current.horn = true;
      if (k === "q") setBlinker("left");
      if (k === "e") setBlinker("right");
      if (k === "x") setBlinker((b) => (b === "hazard" ? "off" : "hazard"));
    }
    function up(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (KEYS.forward.includes(k)) held.current.forward = false;
      if (KEYS.back.includes(k)) held.current.back = false;
      if (KEYS.left.includes(k)) held.current.left = false;
      if (KEYS.right.includes(k)) held.current.right = false;
      if (k === " ") held.current.handbrake = false;
      if (k === "h") held.current.horn = false;
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

      steerRef.current += (steer - steerRef.current) * 0.35;
      onInput({
        throttle,
        steer: steerRef.current,
        handbrake: held.current.handbrake || handbrake,
        horn: held.current.horn,
        blinker,
      });
    }, 50);
    return () => clearInterval(id);
  }, [disabled, onInput, mobileSteer, accel, reverse, handbrake, blinker]);

  return (
    <div className="space-y-2">
      <p className="hidden sm:block text-center text-[11px] text-muted-foreground">
        W/S/A/D · Space HB · H 클락션 · Q/E 방향지시 · X 비상등
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <LightBtn active={blinker === "left"} onClick={() => setBlinker((b) => (b === "left" ? "off" : "left"))} label="←" />
        <LightBtn
          active={blinker === "hazard"}
          onClick={() => setBlinker((b) => (b === "hazard" ? "off" : "hazard"))}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
        <LightBtn active={blinker === "right"} onClick={() => setBlinker((b) => (b === "right" ? "off" : "right"))} label="→" />
        <button
          type="button"
          className="rounded-lg px-3 py-2 text-xs border bg-black/40 border-white/20 active:bg-amber-600/40"
          onPointerDown={() => {
            held.current.horn = true;
          }}
          onPointerUp={() => {
            held.current.horn = false;
          }}
        >
          <Volume2 className="h-3.5 w-3.5" />
        </button>
      </div>

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
              className="absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cyan-500/80 border-2 border-white/40"
              style={{ left: `calc(${((mobileSteer + 1) / 2) * 100}% - 20px)` }}
            />
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
            className={cn("rounded-lg py-2 text-xs border", reverse ? "bg-amber-600 border-amber-400" : "bg-black/40 border-white/20")}
            onPointerDown={() => setReverse(true)}
            onPointerUp={() => setReverse(false)}
          >
            후진
          </button>
          <button
            type="button"
            className={cn("rounded-lg py-2 text-xs border", handbrake ? "bg-red-700 border-red-400" : "bg-black/40 border-white/20")}
            onPointerDown={() => setHandbrake(true)}
            onPointerUp={() => setHandbrake(false)}
          >
            HB
          </button>
        </div>
      </div>
    </div>
  );
}

function LightBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-2 text-xs border min-w-[40px]",
        active ? "bg-amber-500/30 border-amber-400 text-amber-100" : "bg-black/40 border-white/20"
      )}
    >
      {icon ?? label}
    </button>
  );
}
