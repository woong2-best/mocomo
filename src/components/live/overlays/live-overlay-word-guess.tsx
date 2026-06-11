"use client";

import type { LiveOverlayWordGuessProps } from "@/lib/live-overlays/types";
import { cn } from "@/lib/utils";

export function LiveOverlayWordGuess({ props }: { props: LiveOverlayWordGuessProps }) {
  const active = props.phase === "active";
  const reveal = props.phase === "reveal";

  return (
    <div className="flex h-full w-full flex-col rounded-xl border-2 border-folk-terracotta/50 bg-black/75 text-white p-3 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-bold text-folk-gold truncate">{props.title}</p>
        {active && (
          <span className="text-xs font-mono font-bold text-amber-300 shrink-0">
            {props.timeLeft}초
          </span>
        )}
      </div>

      <p className="text-[10px] text-white/60 mb-1">카테고리: {props.category}</p>
      {props.hint && (
        <p className="text-sm font-medium mb-2 break-words">힌트: {props.hint}</p>
      )}

      {reveal && (
        <p className="text-lg font-black text-folk-gold text-center my-2">
          정답: {props.answer}
        </p>
      )}
      {props.winner && (
        <p className="text-xs text-emerald-300 font-bold text-center">
          🎉 {props.winner}님 정답!
        </p>
      )}

      {active && (
        <p className="text-[10px] text-white/55 text-center mt-1">
          채팅으로 정답을 입력하세요
        </p>
      )}

      {props.recentGuesses.length > 0 && (
        <div className="mt-2 flex-1 min-h-0 overflow-hidden space-y-1">
          {props.recentGuesses.slice(-6).map((g, i) => (
            <p
              key={`${g.username}-${i}`}
              className={cn(
                "text-[11px] truncate",
                g.correct ? "text-emerald-300 font-bold" : "text-white/65"
              )}
            >
              {g.username}: {g.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
