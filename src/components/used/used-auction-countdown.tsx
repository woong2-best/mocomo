"use client";

import { useEffect, useState } from "react";
import { auctionCountdownParts, type AuctionCountdownParts } from "@/lib/used-auction";

const CLOCK_CELLS = [
  ["days", "일"],
  ["hours", "시"],
  ["minutes", "분"],
  ["seconds", "초"],
] as const;

export function UsedAuctionCountdown({
  endsAt,
  className = "",
  variant = "clock",
}: {
  endsAt: string | Date;
  className?: string;
  variant?: "clock" | "compact";
}) {
  const [parts, setParts] = useState<AuctionCountdownParts | null>(null);

  useEffect(() => {
    const tick = () => setParts(auctionCountdownParts(endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!parts) {
    return (
      <span className={`font-mono tabular-nums text-orange-500/70 ${className}`} aria-hidden>
        --:--:--:--
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <span
        className={`inline-flex items-center rounded-md bg-zinc-950 px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums tracking-wider ${
          parts.ended ? "text-zinc-400" : "text-orange-400"
        } ${className}`}
        aria-label={parts.ended ? "경매 마감" : `남은 시간 ${parts.text}`}
      >
        {parts.ended ? "00:00:00:00" : parts.text}
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-end gap-1 ${className}`}
      aria-label={parts.ended ? "경매 마감" : `남은 시간 ${parts.text}`}
    >
      {CLOCK_CELLS.map(([key, label], index) => (
        <span key={key} className="inline-flex items-end gap-1">
          {index > 0 ? (
            <span className="pb-4 font-mono text-lg font-bold leading-none text-orange-500/80">:</span>
          ) : null}
          <span className="flex flex-col items-center">
            <span
              className={`min-w-[2.6rem] rounded-md px-1.5 py-1.5 text-center font-mono text-xl font-bold tabular-nums leading-none tracking-widest ${
                parts.ended
                  ? "bg-muted text-muted-foreground"
                  : "bg-zinc-950 text-orange-400 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.45)]"
              }`}
            >
              {parts[key]}
            </span>
            <span className="mt-1 text-[10px] text-muted-foreground">{label}</span>
          </span>
        </span>
      ))}
    </div>
  );
}
