"use client";

import type { LiveOverlayChosungQuizProps } from "@/lib/live-overlays/types";
import { cn } from "@/lib/utils";

export function LiveOverlayChosungQuiz({ props }: { props: LiveOverlayChosungQuizProps }) {
  const active = props.phase === "active";
  const reveal = props.phase === "reveal";
  const topScores = [...props.scores].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div className="flex h-full w-full flex-col rounded-xl border-2 border-sky-400/50 bg-black/78 text-white p-3 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-bold text-sky-300 truncate">{props.title}</p>
        {active && (
          <span className="text-xs font-mono font-bold text-amber-300 shrink-0">
            {props.timeLeft}초
          </span>
        )}
      </div>

      <p className="text-[10px] text-white/60 mb-2">카테고리: {props.category}</p>

      {(active || reveal) && props.chosung && (
        <div className="rounded-lg bg-sky-500/15 border border-sky-400/30 px-3 py-3 mb-2 text-center">
          <p className="text-[10px] text-sky-200/80 mb-1">초성</p>
          <p className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-sky-100 break-all leading-tight">
            {props.chosung}
          </p>
        </div>
      )}

      {props.hint && active && (
        <p className="text-xs text-white/75 mb-2 text-center">힌트: {props.hint}</p>
      )}

      {reveal && (
        <p className="text-lg font-black text-sky-200 text-center my-1">
          정답: {props.answer}
        </p>
      )}

      {props.winner && (
        <p className="text-xs text-emerald-300 font-bold text-center">
          🎉 {props.winner}님 정답! (+{props.points}점)
        </p>
      )}

      {active && (
        <p className="text-[10px] text-white/55 text-center mt-1">
          채팅으로 정답 단어를 입력하세요
        </p>
      )}

      {props.recentGuesses.length > 0 && (
        <div className="mt-2 flex-1 min-h-0 overflow-hidden space-y-1">
          {props.recentGuesses.slice(-5).map((g, i) => (
            <p
              key={`${g.username}-${i}`}
              className={cn(
                "text-[11px] truncate",
                g.correct ? "text-emerald-300 font-bold" : "text-white/60"
              )}
            >
              {g.username}: {g.text}
            </p>
          ))}
        </div>
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
