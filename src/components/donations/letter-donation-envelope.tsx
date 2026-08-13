"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type LetterDonationPreview = {
  tipId?: string;
  amount: number;
  message: string;
  senderName?: string;
  /** Receiver can open; sender preview is read-only */
  interactive?: boolean;
  className?: string;
};

export function LetterDonationEnvelope({
  amount,
  message,
  senderName,
  interactive = true,
  className,
}: LetterDonationPreview) {
  const [open, setOpen] = useState(false);

  const onOpen = useCallback(() => {
    if (!interactive || open) return;
    setOpen(true);
  }, [interactive, open]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        type="button"
        onClick={onOpen}
        disabled={!interactive || open}
        className={cn(
          "relative w-full max-w-[280px] aspect-[4/3] select-none",
          interactive && !open && "cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-transform",
          (!interactive || open) && "cursor-default"
        )}
        aria-label={open ? "편지가 열렸습니다" : "편지 봉투 열기"}
      >
        {/* Envelope body */}
        <div
          className={cn(
            "absolute inset-0 rounded-lg overflow-hidden shadow-lg transition-all duration-700 ease-out",
            open && "opacity-40 scale-95"
          )}
        >
          <Image
            src="/donations/wax-envelope.png"
            alt=""
            fill
            className="object-cover"
            sizes="280px"
            priority
          />
        </div>

        {/* Letter slides out */}
        <div
          className={cn(
            "absolute left-[12%] right-[12%] top-[18%] bottom-[8%] rounded-md bg-[#faf6ee] border border-[#d4c4a8] shadow-md",
            "flex flex-col p-4 text-left transition-all duration-700 ease-out",
            open ? "translate-y-[-28%] opacity-100 scale-100" : "translate-y-[8%] opacity-0 scale-[0.92] pointer-events-none"
          )}
        >
          {senderName ? (
            <p className="text-[11px] font-bold text-[#8b6914] mb-1">From {senderName}</p>
          ) : null}
          <p className="text-sm text-[#2a2418] leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto max-h-[120px]">
            {message}
          </p>
          <p className="mt-3 text-right text-base font-black text-[#1B4A8C] tabular-nums">
            {amount.toLocaleString("ko-KR")}원
          </p>
          <p className="text-[10px] text-[#8b7355] text-right mt-1">크리에이터 정산 · 수수료 10%</p>
        </div>
      </button>

      {!open && interactive ? (
        <p className="text-xs text-muted-foreground font-medium">봉투를 눌러 편지를 열어보세요</p>
      ) : null}
    </div>
  );
}
