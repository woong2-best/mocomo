"use client";

import Image from "next/image";
import { Bath, BedDouble, DoorOpen, KeyRound, Sofa } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  isLoggedIn: boolean;
  homeFloor?: number;
  regionLabel?: string | null;
  startPhase: "idle" | "contract" | "home";
  onEnter: () => void;
  onSignup: () => void;
  onLogin: () => void;
  className?: string;
};

const STRUCTURE_ITEMS = [
  { icon: Bath, label: "화장실 1개" },
  { icon: BedDouble, label: "방 2개" },
  { icon: Sofa, label: "부엌 및 거실 1공간" },
] as const;

export function AptOverviewHero({
  isLoggedIn,
  homeFloor,
  regionLabel,
  startPhase,
  onEnter,
  onSignup,
  onLogin,
  className,
}: Props) {
  const busy = startPhase !== "idle";

  return (
    <div
      className={cn(
        "absolute inset-0 z-[80] flex flex-col bg-[#F5F0E8]",
        "pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]",
        className
      )}
    >
      <div className="relative min-h-0 flex-1 px-3 pt-2">
        <div className="relative mx-auto h-full w-full max-w-lg">
          <Image
            src="/diorama/apt-overview.png"
            alt="2룸 1욕실 아파트 평면도"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 480px"
            className="object-contain object-center drop-shadow-[0_24px_48px_rgba(60,45,30,0.12)]"
          />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-1">
        <div className="mx-auto w-full max-w-lg rounded-[1.75rem] border border-[#E8DCC8] bg-[#F7F0E4]/95 px-4 py-4 shadow-[0_12px_40px_rgba(80,60,40,0.08)] backdrop-blur-sm">
          <p className="text-center text-sm font-black text-[#5C4A3A]">일반적인 구조 예시</p>

          <div className="mt-3 flex items-stretch justify-between gap-1 text-center">
            {STRUCTURE_ITEMS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl bg-white/70 px-1 py-2"
              >
                <Icon className="h-5 w-5 text-[#8B7355]" strokeWidth={2.2} />
                <span className="text-[10px] font-bold leading-tight text-[#6B5744]">{label}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onEnter}
            disabled={busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5C4A3A] px-5 py-3.5 text-base font-black text-white shadow-[0_4px_0_#3D3024] transition active:translate-y-0.5 active:shadow-none disabled:opacity-70"
          >
            {startPhase === "home" ? (
              <>
                <DoorOpen className="h-5 w-5" />
                집 들어가는 중…
              </>
            ) : (
              <>
                <DoorOpen className="h-5 w-5" />
                {isLoggedIn ? "내 집 들어가기" : "집 구경하기"}
              </>
            )}
          </button>

          {!isLoggedIn && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSignup}
                disabled={busy}
                className="rounded-xl border border-[#D9CBB5] bg-white px-3 py-2.5 text-xs font-bold text-[#5C4A3A] transition active:scale-[0.98] disabled:opacity-70"
              >
                회원가입
              </button>
              <button
                type="button"
                onClick={onLogin}
                disabled={busy}
                className="flex items-center justify-center gap-1 rounded-xl border border-[#D9CBB5] bg-white px-3 py-2.5 text-xs font-bold text-[#5C4A3A] transition active:scale-[0.98] disabled:opacity-70"
              >
                <KeyRound className="h-3.5 w-3.5" />
                로그인
              </button>
            </div>
          )}

          {isLoggedIn && (
            <p className="mt-3 text-center text-[11px] font-medium text-[#8B7355]">
              {regionLabel ?? "MoCoMo APT"} · {homeFloor ?? 500}층
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
