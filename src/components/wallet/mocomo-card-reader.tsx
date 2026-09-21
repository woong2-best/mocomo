"use client";

import { cn } from "@/lib/utils";
import type { ReaderLightState } from "@/components/wallet/wallet-payment-types";

type Props = {
  light: ReaderLightState;
  active?: boolean;
  className?: string;
};

export function MocomoCardReader({ light, active = false, className }: Props) {
  const greenOn = light === "success";
  const redOn = light === "failure";
  const processing = active && light === "idle";

  return (
    <div
      className={cn(
        "relative flex w-[5.25rem] shrink-0 flex-col rounded-[1.35rem] border border-[#3d4349]",
        "bg-gradient-to-b from-[#52585f] via-[#3a4047] to-[#2a2f35]",
        "p-1.5 shadow-[0_14px_32px_-8px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.12)]",
        className,
      )}
      aria-label="카드 리더기"
    >
      <div className="flex min-h-[13.5rem] flex-1 gap-1 rounded-[1.05rem] bg-gradient-to-b from-[#2f343a] to-[#22272c] p-1">
        <div className="relative flex flex-1 items-center justify-center rounded-lg bg-gradient-to-br from-[#383e45] to-[#2a2f34] shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)]">
          <div
            className="h-9 w-12 rounded-md border border-[#1a1e22] bg-gradient-to-br from-[#4a5159] to-[#353b42] shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]"
            aria-hidden
          >
            <div className="m-1.5 h-4 w-5 rounded-sm border border-[#5c636b]/50 bg-[#6b737c]/40" />
          </div>
        </div>

        <div
          className={cn(
            "relative w-[0.55rem] shrink-0 rounded-full",
            "bg-gradient-to-b from-[#0a0c0e] via-[#15181c] to-[#0a0c0e]",
            processing && "shadow-[inset_0_0_14px_rgba(156,163,175,0.35)]",
          )}
          aria-hidden
        />

        <div className="relative flex flex-1 flex-col rounded-lg bg-gradient-to-br from-[#383e45] to-[#2a2f34] shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)]">
          <div className="flex flex-1 items-end justify-end p-2.5">
            <div className="flex flex-col gap-2">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full border border-[#1a1f24]",
                  greenOn
                    ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95),0_0_20px_rgba(52,211,153,0.45)]"
                    : "bg-[#1f2429] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full border border-[#1a1f24]",
                  redOn
                    ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.95),0_0_20px_rgba(239,68,68,0.45)]"
                    : "bg-[#1f2429] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]",
                )}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-[#9ca3af]">
        Reader
      </p>
    </div>
  );
}
