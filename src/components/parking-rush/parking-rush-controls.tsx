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

const KEY_HELP = [
  { key: "W", label: "전진", color: "text-emerald-300" },
  { key: "S", label: "후진", color: "text-amber-300" },
  { key: "A", label: "좌회전", color: "text-sky-300" },
  { key: "D", label: "우회전", color: "text-sky-300" },
  { key: "Q", label: "좌 깜박이", color: "text-yellow-300" },
  { key: "E", label: "우 깜박이", color: "text-yellow-300" },
  { key: "X", label: "비상등", color: "text-orange-300" },
  { key: "Space", label: "핸드브레이크", color: "text-red-300" },
  { key: "H", label: "경적", color: "text-amber-200" },
  { key: "C", label: "카메라 리셋", color: "text-blue-300" },
] as const;

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
      if (k === "q") setBlinker((b) => (b === "left" ? "off" : "left"));
      if (k === "e") setBlinker((b) => (b === "right" ? "off" : "right"));
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
    <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-b from-slate-900/95 via-stone-900/90 to-black/85 p-3 space-y-3 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
      <div className="hidden lg:grid grid-cols-5 sm:grid-cols-5 gap-1.5">
        {KEY_HELP.map(({ key, label, color }) => (
          <div
            key={key}
            className="flex flex-col items-center rounded-lg border border-white/10 bg-black/35 px-1 py-1.5"
          >
            <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 text-amber-100">
              {key}
            </kbd>
            <span className={cn("text-[9px] mt-0.5 text-center leading-tight", color)}>{label}</span>
          </div>
        ))}
      </div>

      <div className="hidden sm:flex lg:hidden flex-wrap items-center justify-center gap-2 text-[10px] text-white/50">
        <kbd className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/25">W/S</kbd>
        <span>전진·후진</span>
        <kbd className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/25">A/D</kbd>
        <span>조향</span>
        <kbd className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/25">Q/E</kbd>
        <span>깜박이</span>
        <kbd className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/25">드래그</kbd>
        <span>시점</span>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <LightBtn
          label="Q"
          active={blinker === "left"}
          onClick={() => setBlinker((b) => (b === "left" ? "off" : "left"))}
          icon={<ChevronLeft className="h-4 w-4" />}
        />
        <LightBtn
          label="X"
          active={blinker === "hazard"}
          onClick={() => setBlinker((b) => (b === "hazard" ? "off" : "hazard"))}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
        <LightBtn
          label="E"
          active={blinker === "right"}
          onClick={() => setBlinker((b) => (b === "right" ? "off" : "right"))}
          icon={<ChevronRight className="h-4 w-4" />}
        />
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
            label="W"
            sub="전진"
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
            label="S"
            sub="후진"
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
            className="relative w-full max-w-[220px] h-28 rounded-2xl border border-amber-400/30 bg-black/50 shadow-inner"
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
              className="absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 border-2 border-white/50 shadow-lg"
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
            W
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
            S
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
    <div className="relative h-24 w-24 mx-auto rounded-full border-2 border-amber-400/30 bg-gradient-to-b from-stone-700 to-stone-950 shadow-inner">
      <div
        className="absolute inset-2 rounded-full border border-white/10 transition-transform duration-75"
        style={{ transform: `rotate(${active * 45}deg)` }}
      >
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-4 bg-amber-400 rounded-full" />
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-stone-800 border border-white/20" />
      </div>
    </div>
  );
}

function Pedal({
  label,
  sub,
  active,
  color,
  onDown,
  onUp,
}: {
  label: string;
  sub: string;
  active: boolean;
  color: "emerald" | "amber";
  onDown: () => void;
  onUp: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-12 rounded-xl font-black border transition-all active:scale-95 flex flex-col items-center justify-center leading-none",
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
      <span className="text-lg">{label}</span>
      <span className="text-[9px] font-normal opacity-70">{sub}</span>
    </button>
  );
}

function LightBtn({
  label,
  active,
  onClick,
  icon,
}: {
  label?: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl px-3 py-2 border min-w-[44px] transition-colors flex flex-col items-center gap-0.5",
        active ? "bg-amber-500/30 border-amber-400 text-amber-50 shadow-[0_0_12px_rgba(251,191,36,0.25)]" : "bg-black/40 border-white/15 text-white/70"
      )}
    >
      {icon}
      {label && <span className="text-[9px] font-bold">{label}</span>}
    </button>
  );
}
