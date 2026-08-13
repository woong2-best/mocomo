"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { OreIcon } from "@/components/support/ore-icon";
import { LetterDonationEnvelope } from "@/components/donations/letter-donation-envelope";
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
  /** paid tip vs virtual cheer vs live chat highlight */
  kind?: "tip" | "cheer" | "chat" | "letter";
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
  const isChat = tip.kind === "chat";
  const isLetter = tip.kind === "letter" || (!!tip.message?.trim() && tip.kind === "tip");
  const unit = isCheer ? "CP" : isChat ? "" : "후원";

  let headline: ReactNode;
  if (isChat) {
    headline = (
      <>
        <span className="text-[#7dd3fc]">{name}</span>
        <span className="text-white font-bold"> · 채팅</span>
      </>
    );
  } else if (tip.eventType === "ROULETTE" && tip.rouletteLabel) {
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
        "animate-in fade-in slide-in-from-right-4 duration-300",
        isLetter ? "max-w-[min(320px,48vw)]" : "max-w-[min(300px,42vw)]",
        "rounded-xl border border-white/15 bg-black/72 px-3 py-2.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)] backdrop-blur-sm",
        isChat && "border-sky-400/25"
      )}
    >
      {isLetter && tip.message?.trim() ? (
        <div className="py-1">
          <p className="text-[11px] font-bold text-amber-100 mb-2" style={{ textShadow: STROKE }}>
            {name}님의 편지 후원 · {tip.amount.toLocaleString()}원
          </p>
          <LetterDonationEnvelope
            amount={tip.amount}
            message={tip.message.trim()}
            senderName={name}
            interactive
            className="scale-90 origin-top"
          />
        </div>
      ) : (
        <>
          <p
            className="text-[13px] sm:text-sm font-extrabold leading-snug flex flex-wrap items-center gap-x-1 gap-y-0.5"
            style={{ textShadow: STROKE }}
          >
            {headline}
          </p>
          {tip.message?.trim() ? (
            <p
              className={cn(
                "mt-1.5 text-[12px] sm:text-[13px] font-semibold leading-snug line-clamp-4 break-words",
                isChat ? "text-sky-50" : "text-amber-50"
              )}
              style={{ textShadow: STROKE }}
            >
              {tip.message.trim()}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

const ALERT_MS: Record<string, number> = {
  chat: 4200,
  cheer: 5200,
  tip: 5800,
};

function alertDuration(tip: LiveTipAlert) {
  if (tip.kind === "chat") return ALERT_MS.chat;
  if (tip.kind === "cheer") return ALERT_MS.cheer;
  return ALERT_MS.tip;
}

/** 트witch/치지직 스타일 — 영상 오른쪽 알림 (라이브 페이지 후원·CP·채팅) */
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
    }, alertDuration(current));
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  return (
    <div
      className="pointer-events-none absolute right-2 sm:right-3 top-[12%] sm:top-[14%] z-30 flex flex-col items-end gap-2 max-h-[55%]"
      aria-live="polite"
    >
      <LiveDonationAlertCard key={current.id} tip={current} />
    </div>
  );
}

/** @deprecated alias */
export const LiveSideAlertStack = LiveDonationAlertOverlay;

/** @deprecated use LiveDonationAlertOverlay */
export function LiveTipAlerts({ tips }: { tips: LiveTipAlert[] }) {
  return (
    <div className="fixed bottom-24 left-4 z-40 pointer-events-none">
      <LiveDonationAlertOverlay tips={tips} />
    </div>
  );
}
