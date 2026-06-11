"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { OreIcon } from "@/components/support/ore-icon";
import { tierFromAmount } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { ensureArray } from "@/lib/ensure-array";
import type { LiveSupportEventType } from "@prisma/client";

export type LiveTipAlert = {
  id: string;
  amount: number;
  message: string | null;
  username: string;
  at: number;
  anonymous?: boolean;
  /** paid tip vs virtual cheer */
  kind?: "tip" | "cheer";
  eventType?: LiveSupportEventType;
  rouletteLabel?: string;
};

const STROKE =
  "0 2px 0 #000, 0 -2px 0 #000, 2px 0 0 #000, -2px 0 0 #000, 0 0 6px #000, 0 0 12px rgba(0,0,0,0.85)";

function formatDonorName(username: string, anonymous?: boolean) {
  if (anonymous) return "익명의 후원자";
  return username.startsWith("@") ? username.slice(1) : username;
}

function LiveDonationAlertCard({ tip }: { tip: LiveTipAlert }) {
  const name = formatDonorName(tip.username, tip.anonymous);
  const tier = tierFromAmount(tip.amount);
  const isCheer = tip.kind === "cheer";
  const unit = isCheer ? "CP" : "후원";

  let headline: ReactNode;
  if (tip.eventType === "ROULETTE" && tip.rouletteLabel) {
    headline = (
      <>
        <span className="text-[#5dff6a]">{name}</span>
        <span className="text-white font-bold">님 룰렛!</span>
        <span className="text-[#ffe44d]">{tip.rouletteLabel}</span>
      </>
    );
  } else if (tip.eventType === "TTS") {
    headline = (
      <>
        <span className="text-[#5dff6a]">{name}</span>
        <span className="text-white font-bold">님 TTS</span>
        <span className="text-[#ffe44d] tabular-nums">{tip.amount.toLocaleString()} {unit}</span>
      </>
    );
  } else if (tip.eventType === "SOUND") {
    headline = (
      <>
        <span className="text-[#5dff6a]">{name}</span>
        <span className="text-white font-bold">님 사운드</span>
        <span className="text-[#ffe44d] tabular-nums">{tip.amount.toLocaleString()} {unit}</span>
      </>
    );
  } else if (tip.eventType === "VOTE") {
    headline = (
      <>
        <span className="text-[#5dff6a]">{name}</span>
        <span className="text-white font-bold">님 투표</span>
        <span className="text-[#ffe44d] tabular-nums">{tip.amount.toLocaleString()} {unit}</span>
      </>
    );
  } else {
    headline = (
      <>
        <span className="text-[#5dff6a]">{name}</span>
        <span className="text-white font-bold">님이</span>
        <OreIcon tier={tier} size={28} className="inline-block drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
        <span className="text-[#ffe44d] tabular-nums">
          {tip.amount.toLocaleString()} {unit}!
        </span>
      </>
    );
  }

  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-500",
        "flex flex-col items-center text-center px-4 max-w-lg mx-auto"
      )}
    >
      <p
        className="text-xl sm:text-2xl font-extrabold leading-snug flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5"
        style={{ textShadow: STROKE }}
      >
        {headline}
      </p>
      {tip.message?.trim() && (
        <p
          className="mt-2 text-base sm:text-lg font-bold text-white leading-snug line-clamp-3"
          style={{ textShadow: STROKE }}
        >
          {tip.message.trim()}
        </p>
      )}
    </div>
  );
}

/** 치지직 스타일 방송 중 후원 알림 — 영상 위 중앙 하단 */
export function LiveDonationAlertOverlay({ tips }: { tips: LiveTipAlert[] }) {
  const seenRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<LiveTipAlert[]>([]);
  const [current, setCurrent] = useState<LiveTipAlert | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    const list = ensureArray<LiveTipAlert>(tips);
    for (const t of list) {
      if (seenRef.current.has(t.id)) continue;
      seenRef.current.add(t.id);
      queueRef.current.push(t);
    }
    if (!playingRef.current && queueRef.current.length > 0) {
      playingRef.current = true;
      setCurrent(queueRef.current.shift()!);
    }
  }, [tips]);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => {
      const next = queueRef.current.shift();
      if (next) {
        setCurrent(next);
      } else {
        playingRef.current = false;
        setCurrent(null);
      }
    }, 5500);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-[18%] sm:bottom-[22%] z-30 flex justify-center px-3"
      aria-live="polite"
    >
      <LiveDonationAlertCard key={current.id} tip={current} />
    </div>
  );
}

/** @deprecated use LiveDonationAlertOverlay */
export function LiveTipAlerts({ tips }: { tips: LiveTipAlert[] }) {
  return (
    <div className="fixed bottom-24 left-4 z-40 pointer-events-none">
      <LiveDonationAlertOverlay tips={tips} />
    </div>
  );
}
