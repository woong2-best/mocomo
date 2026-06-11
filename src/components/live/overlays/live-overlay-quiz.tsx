"use client";

import type { LiveOverlayQuizProps } from "@/lib/live-overlays/types";
import { cn } from "@/lib/utils";

const LABELS = ["①", "②", "③", "④"];

export function LiveOverlayQuiz({ props }: { props: LiveOverlayQuizProps }) {
  const active = props.phase === "active";
  const reveal = props.phase === "reveal";
  const topScores = [...props.scores].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div className="flex h-full w-full flex-col rounded-xl border-2 border-violet-400/50 bg-black/75 text-white p-3 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-bold text-violet-300 truncate">{props.title}</p>
        {active && (
          <span className="text-xs font-mono font-bold text-amber-300 shrink-0">
            {props.timeLeft}초
          </span>
        )}
      </div>

      <p className="text-sm sm:text-base font-bold leading-snug mb-2 break-words">
        {props.question}
      </p>

      <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
        {props.options.map((opt, i) => {
          const isCorrect = reveal && i === props.correctIndex;
          const showWrong = reveal && i !== props.correctIndex;
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg px-2 py-1.5 text-xs sm:text-sm border flex items-start gap-1 min-h-[2.25rem]",
                isCorrect && "border-emerald-400 bg-emerald-500/25 font-bold",
                showWrong && "border-white/10 bg-white/5 opacity-50",
                !reveal && "border-white/20 bg-white/10"
              )}
            >
              <span className="shrink-0 text-violet-300">{LABELS[i]}</span>
              <span className="break-words leading-tight">{opt || `선택 ${i + 1}`}</span>
            </div>
          );
        })}
      </div>

      {props.lastWinner && reveal && (
        <p className="text-xs text-emerald-300 font-bold mt-2 text-center">
          🎉 {props.lastWinner} 정답!
        </p>
      )}

      {active && (
        <p className="text-[10px] text-white/55 mt-2 text-center">
          채팅에 1~4 또는 A~D로 답하세요
        </p>
      )}

      {topScores.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/15 text-[10px] text-white/70 space-y-0.5">
          <p className="font-bold text-white/90">점수</p>
          {topScores.map((s, i) => (
            <div key={s.username} className="flex justify-between gap-2">
              <span>{i + 1}. {s.username}</span>
              <span>{s.score}점</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
