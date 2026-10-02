"use client";

import { memo } from "react";
import type { StickerFunction } from "@/lib/diorama/sticker-types";
import { FUNCTION_HINT_LAYOUT } from "@/lib/diorama/functional-hints";
import { cn } from "@/lib/utils";

export type FurnitureHintState = {
  hasUnreadMail?: boolean;
  hasMissedCall?: boolean;
};

function LiveTvHint() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[3px] bg-gradient-to-b from-sky-800 to-sky-950 shadow-inner">
      <div className="absolute inset-x-[12%] bottom-[18%] top-[28%] flex items-end justify-center gap-[6%]">
        {[0.4, 0.7, 1, 0.55, 0.85, 0.45].map((h, i) => (
          <span
            key={i}
            className="w-[10%] rounded-sm bg-sky-300/90 animate-pulse"
            style={{ height: `${h * 100}%`, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <span className="absolute left-[8%] top-[8%] rounded-[2px] bg-red-500 px-[0.35em] py-[0.1em] text-[0.42em] font-black leading-none text-white shadow-sm">
        LIVE
      </span>
    </div>
  );
}

function MailboxHint({ active }: { active: boolean }) {
  return (
    <>
      <div
        className={cn(
          "absolute right-[6%] top-0 h-[55%] w-[38%] origin-bottom-right rotate-[18deg] rounded-sm border border-red-400/80 bg-red-400 shadow-sm",
          active && "animate-bounce"
        )}
      />
      {active && (
        <span className="absolute -right-[4%] -top-[8%] flex h-[0.9em] w-[0.9em] items-center justify-center rounded-full bg-amber-300 text-[0.55em] shadow-md">
          ✉
        </span>
      )}
    </>
  );
}

function PhoneHint({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "absolute right-[4%] top-[4%] h-[0.75em] w-[0.75em] rounded-full border border-white/80 shadow-sm",
        active
          ? "animate-pulse bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]"
          : "bg-red-400/90"
      )}
    />
  );
}

function CommunityHint() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2px] bg-gradient-to-b from-indigo-900 to-slate-900 shadow-inner">
      <div className="absolute inset-[10%] grid grid-cols-3 gap-[8%] p-[6%]">
        {["💬", "👥", "🏠", "❤", "📷", "✨"].map((icon, i) => (
          <span key={i} className="flex items-center justify-center text-[0.55em] leading-none opacity-90">
            {icon}
          </span>
        ))}
      </div>
      <span className="absolute bottom-[6%] left-[8%] text-[0.38em] font-bold text-sky-200/90">MoCoMo</span>
    </div>
  );
}

function WardrobeHint() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span className="text-[1.1em] leading-none opacity-85 drop-shadow-sm">👕</span>
      <span className="absolute bottom-[8%] right-[10%] text-[0.65em] opacity-70">✨</span>
    </div>
  );
}

function MirrorHint() {
  return (
    <div className="absolute inset-[8%] overflow-hidden rounded-full bg-gradient-to-br from-sky-100/50 via-white/30 to-pink-100/40">
      <span className="absolute left-[18%] top-[22%] text-[0.7em] opacity-60">☺</span>
      <span className="absolute bottom-[12%] right-[14%] animate-pulse text-[0.5em]">✦</span>
    </div>
  );
}

function FunctionalFurnitureHintInner({
  assetId,
  fn,
  hintState,
}: {
  assetId: string;
  fn: StickerFunction;
  hintState?: FurnitureHintState;
}) {
  const layout = FUNCTION_HINT_LAYOUT[assetId];
  if (!layout) return null;

  return (
    <div
      className="pointer-events-none absolute z-[1]"
      style={{
        left: `${layout.left}%`,
        top: `${layout.top}%`,
        width: `${layout.width}%`,
        height: `${layout.height}%`,
      }}
    >
      {fn === "live-tv" && <LiveTvHint />}
      {fn === "mailbox" && <MailboxHint active={!!hintState?.hasUnreadMail} />}
      {fn === "phone" && <PhoneHint active={!!hintState?.hasMissedCall} />}
      {fn === "community" && <CommunityHint />}
      {fn === "avatar-edit" && <WardrobeHint />}
      {fn === "profile-edit" && <MirrorHint />}
    </div>
  );
}

export const FunctionalFurnitureHint = memo(FunctionalFurnitureHintInner);
