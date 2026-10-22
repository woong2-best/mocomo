"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  createAiMotion,
  setLook,
  stepAiMotion,
  type AiMotionState,
  type AiPose,
} from "@/lib/ai-live/motion";

const REST: AiPose = {
  breath: 0,
  head: 0,
  blink: 0,
  lookX: 0,
  lookY: 0,
  mouth: 0,
  angry: 0,
};

/** One grid cell. Same size as every other live tile. No chat. */
export function AiLiveTile() {
  const { t } = useLocale();
  const reduced = usePrefersReducedMotion();
  const motionRef = useRef<AiMotionState | null>(null);
  const [pose, setPose] = useState<AiPose>(REST);

  useEffect(() => {
    motionRef.current = createAiMotion(performance.now());
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      const motion = motionRef.current;
      if (motion && !document.hidden && now - last > 40) {
        last = now;
        setPose(stepAiMotion(motion, now, reduced));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const eye = Math.max(0.14, 1 - pose.blink * 0.9);

  return (
    <div className="min-w-0">
      <div
        className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#f6d5c4]"
        onPointerMove={(e) => {
          const motion = motionRef.current;
          const rect = e.currentTarget.getBoundingClientRect();
          if (!motion || rect.width < 1) return;
          setLook(
            motion,
            ((e.clientX - rect.left) / rect.width - 0.5) * 2,
            ((e.clientY - rect.top) / rect.height - 0.4) * 2
          );
        }}
        onPointerLeave={() => {
          const motion = motionRef.current;
          if (motion) setLook(motion, 0, 0);
        }}
      >
        <svg viewBox="0 0 320 180" className="absolute inset-0 h-full w-full" aria-hidden>
          <rect width="320" height="180" fill="#f6d5c4" />
          <ellipse cx="160" cy="40" rx="120" ry="70" fill="#f3c2b0" />
          <g transform={`translate(0 ${pose.breath})`}>
            <path d="M36 148 Q160 112 284 148 L308 180 L12 180 Z" fill="#c45c3e" />
            <path d="M132 146 Q160 162 188 146 L180 168 Q160 176 140 168 Z" fill="#f6e7d4" />
          </g>
          <g transform={`translate(160 112) rotate(${pose.head})`}>
            <path
              d="M-78 -8 C-90 -86 -16 -108 8 -96 C62 -112 92 -72 84 0 C78 52 40 72 0 64 C-44 72 -74 40 -78 -8 Z"
              fill="#3a2430"
            />
            <ellipse cx="0" cy="-8" rx="62" ry="68" fill="#f3c7b4" />
            <ellipse cx="-30" cy="10" rx="13" ry="7" fill="rgba(232,120,150,0.45)" />
            <ellipse cx="30" cy="10" rx="13" ry="7" fill="rgba(232,120,150,0.45)" />
            <path d="M-52 -42 Q0 -68 54 -40 Q28 -24 0 -30 Q-28 -24 -52 -42 Z" fill="#3a2430" />
            <Eye cx={-24 + pose.lookX * 3} cy={-10 + pose.lookY * 2} eye={eye} lookX={pose.lookX} lookY={pose.lookY} />
            <Eye cx={24 + pose.lookX * 3} cy={-10 + pose.lookY * 2} eye={eye} lookX={pose.lookX} lookY={pose.lookY} />
            <path
              d="M-18 26 Q0 34 18 26"
              stroke="#c45c78"
              strokeWidth="3.2"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </svg>
        <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-[#1a4fa0] px-1.5 py-0.5 text-[10px] font-black text-white">
          {t("live.aiOfficialBadge")}
        </span>
      </div>
      <div className="mt-2.5 min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold text-white">{t("live.aiHostName")}</p>
        <p className="line-clamp-1 text-[13px] text-white/65">{t("live.aiCardTitle")}</p>
        <span className="inline-flex rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
          {t("live.aiCardSub")}
        </span>
      </div>
    </div>
  );
}

function Eye({
  cx,
  cy,
  eye,
  lookX,
  lookY,
}: {
  cx: number;
  cy: number;
  eye: number;
  lookX: number;
  lookY: number;
}) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(1 ${eye})`}>
      <ellipse cx="0" cy="0" rx="13" ry="10" fill="#fff" />
      <circle cx={lookX * 1.4} cy={lookY} r="5.2" fill="#4a6741" />
      <circle cx={lookX * 1.4} cy={lookY} r="2.5" fill="#1a120c" />
      <circle cx={lookX * 1.4 + 1.8} cy={lookY - 1.8} r="1.3" fill="#fff" />
    </g>
  );
}
