"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
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
  const [keySteer, setKeySteer] = useState(0);
  const [keyForward, setKeyForward] = useState(false);
  const [keyBack, setKeyBack] = useState(false);
  const [keyHb, setKeyHb] = useState(false);

  useEffect(() => {
    if (disabled) return;
    function down(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (KEYS.forward.includes(k)) {
        held.current.forward = true;
        setKeyForward(true);
      }
      if (KEYS.back.includes(k)) {
        held.current.back = true;
        setKeyBack(true);
      }
      if (KEYS.left.includes(k)) {
        held.current.left = true;
        setKeySteer(-1);
      }
      if (KEYS.right.includes(k)) {
        held.current.right = true;
        setKeySteer(1);
      }
      if (k === " ") {
        held.current.handbrake = true;
        setKeyHb(true);
        e.preventDefault();
      }
      if (k === "h") held.current.horn = true;
      if (k === "q") setBlinker("left");
      if (k === "e") setBlinker("right");
      if (k === "x") setBlinker((b) => (b === "hazard" ? "off" : "hazard"));
    }
    function up(e: KeyboardEvent) {
      const k = e.key.toLowerCase();
      if (KEYS.forward.includes(k)) {
        held.current.forward = false;
        setKeyForward(false);
      }
      if (KEYS.back.includes(k)) {
        held.current.back = false;
        setKeyBack(false);
      }
      if (KEYS.left.includes(k)) {
        held.current.left = false;
        setKeySteer((s) => (held.current.right ? 1 : 0));
      }
      if (KEYS.right.includes(k)) {
        held.current.right = false;
        setKeySteer((s) => (held.current.left ? -1 : 0));
      }
      if (k === " ") {
        held.current.handbrake = false;
        setKeyHb(false);
      }
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

  const steerVisual = keySteer || mobileSteer;

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-slate-950/90 to-black/80 p-3 space-y-3">
      <div className="hidden sm:flex items-center justify-center gap-2 text-[10px] text-white/45 tracking-wide">
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15">WASD</kbd>
        <span>운전</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15">Space</kbd>
        <span>핸드브레이크</span>
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/15">Q/E/X</kbd>
        <span>등화</span>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <LightBtn active={blinker === "left"} onClick={() => setBlinker((b) => (b === "left" ? "off" : "left"))} icon={<ChevronLeft className="h-4 w-4" />} />
        <LightBtn
          active={blinker === "hazard"}
          onClick={() => setBlinker((b) => (b === "hazard" ? "off" : "hazard"))}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
        <LightBtn active={blinker === "right"} onClick={() => setBlinker((b) => (b === "right" ? "off" : "right"))} icon={<ChevronRight className="h-4 w-4" />} />
        <button
          type="button"
          disabled={disabled}
          className="rounded-xl px-3 py-2 border border-white/15 bg-black/50 hover:bg-amber-500/20 active:scale-95 transition-transform disabled:opacity-40"
          onPointerDown={() => {
            held.current.horn = true;
          }}
          onPointerUp={() => {
            held.current.horn = false;
          }}
        >
          <Volume2 className="h-4 w-4 text-amber-200" />
        </button>
      </div>

      <div className="hidden sm:grid grid-cols-[1fr_auto_1fr] gap-3 items-center max-w-md mx-auto select-none">
        <SteerWheel active={steerVisual} />
        <div className="flex flex-col gap-2 w-16">
          <Pedal
            label="D"
            active={keyForward}
            color="emerald"
            onDown={() => {
              held.current.forward = true;
              setKeyForward(true);
            }}
            onUp={() => {
              held.current.forward = false;
              setKeyForward(false);
            }}
          />
          <Pedal
            label="R"
            active={keyBack}
            color="amber"
            onDown={() => {
              held.current.back = true;
              setKeyBack(true);
            }}
            onUp={() => {
              held.current.back = false;
              setKeyBack(false);
            }}
          />
        </div>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-14 rounded-xl font-bold text-sm border transition-all",
            keyHb
              ? "bg-red-600/80 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              : "bg-black/40 border-white/20 text-white/70 hover:border-red-400/50"
          )}
          onPointerDown={() => {
            held.current.handbrake = true;
            setKeyHb(true);
          }}
          onPointerUp={() => {
            held.current.handbrake = false;
            setKeyHb(false);
          }}
        >
          HB
        </button>
      </div>

      <div className="sm:hidden grid grid-cols-3 gap-2 select-none touch-none">
        <div className="col-span-2 flex items-center justify-center">
          <div
            className="relative w-full max-w-[220px] h-28 rounded-2xl border border-cyan-500/30 bg-black/50 shadow-inner"
            onPointerDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              setMobileSteer(Math.max(-1, Math.min(1, (x - 0.5) * 2)));
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
            <div className="absolute inset-x-4 top-1/2 h-px bg-white/15" />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-700 border-2 border-white/50 shadow-lg"
              style={{ left: `calc(${((mobileSteer + 1) / 2) * 100}% - 24px)` }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className={cn(
              "flex-1 rounded-xl font-bold text-sm border min-h-[3rem]",
              accel > 0
                ? "bg-emerald-600 border-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.35)]"
                : "bg-black/40 border-white/20"
            )}
            onPointerDown={() => setAccel(1)}
            onPointerUp={() => setAccel(0)}
            onPointerLeave={() => setAccel(0)}
          >
            D
          </button>
          <button
            type="button"
            className={cn(
              "rounded-xl py-2 text-sm font-bold border",
              reverse ? "bg-amber-600 border-amber-300" : "bg-black/40 border-white/20"
            )}
            onPointerDown={() => setReverse(true)}
            onPointerUp={() => setReverse(false)}
          >
            R
          </button>
          <button
            type="button"
            className={cn(
              "rounded-xl py-2 text-xs font-bold border",
              handbrake ? "bg-red-700 border-red-400" : "bg-black/40 border-white/20"
            )}
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

function SteerWheel({ active }: { active: number }) {
  return (
    <div className="relative h-24 w-24 mx-auto rounded-full border-2 border-white/20 bg-gradient-to-b from-slate-800 to-slate-950 shadow-inner">
      <div
        className="absolute inset-2 rounded-full border border-white/10 transition-transform duration-75"
        style={{ transform: `rotate(${active * 45}deg)` }}
      >
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-4 bg-cyan-400 rounded-full" />
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-slate-700 border border-white/20" />
      </div>
    </div>
  );
}

function Pedal({
  label,
  active,
  color,
  onDown,
  onUp,
}: {
  label: string;
  active: boolean;
  color: "emerald" | "amber";
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-12 rounded-xl font-black text-lg border transition-all active:scale-95",
        active
          ? color === "emerald"
            ? "bg-emerald-600 border-emerald-300 text-white shadow-[0_0_18px_rgba(52,211,153,0.35)]"
            : "bg-amber-600 border-amber-300 text-white shadow-[0_0_18px_rgba(251,191,36,0.35)]"
          : "bg-black/40 border-white/20 text-white/60"
      )}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      {label}
    </button>
  );
}

function LightBtn({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 border min-w-[44px] transition-colors",
        active ? "bg-amber-500/25 border-amber-400 text-amber-100" : "bg-black/40 border-white/15 text-white/70"
      )}
    >
      {icon}
    </button>
  );
}
