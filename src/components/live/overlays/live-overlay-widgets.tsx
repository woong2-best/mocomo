"use client";

import type {
  LiveOverlayChosungQuizProps,
  LiveOverlayLotteryProps,
  LiveOverlayQuizProps,
  LiveOverlayTextProps,
  LiveOverlayWheelProps,
  LiveOverlayWordGuessProps,
} from "@/lib/live-overlays/types";
import { LiveOverlayWheel } from "@/components/live/overlays/live-overlay-wheel";
import { LiveOverlayQuiz } from "@/components/live/overlays/live-overlay-quiz";
import { LiveOverlayWordGuess } from "@/components/live/overlays/live-overlay-word-guess";
import { LiveOverlayChosungQuiz } from "@/components/live/overlays/live-overlay-chosung-quiz";

export function TextOverlayWidget({ props }: { props: LiveOverlayTextProps }) {
  return (
    <div
      className="flex h-full w-full items-center px-3 py-2"
      style={{
        background: props.background,
        justifyContent:
          props.align === "left" ? "flex-start" : props.align === "right" ? "flex-end" : "center",
      }}
    >
      <p
        className="leading-tight break-words w-full"
        style={{
          color: props.color,
          fontSize: props.fontSize,
          fontWeight: props.bold ? 700 : 500,
          textAlign: props.align,
        }}
      >
        {props.content}
      </p>
    </div>
  );
}

export function WheelOverlayWidget({
  widgetId,
  selected,
  props,
}: {
  widgetId: string;
  selected: boolean;
  props: LiveOverlayWheelProps;
}) {
  return <LiveOverlayWheel widgetId={widgetId} selected={selected} props={props} />;
}

export function LotteryOverlayWidget({ props }: { props: LiveOverlayLotteryProps }) {
  return (
    <div className="flex h-full w-full flex-col bg-black/55 text-white p-2 rounded-lg border border-white/20">
      <p className="text-xs font-bold mb-1 truncate">{props.title}</p>
      <div className="flex-1 flex items-center justify-center min-h-0">
        {props.drawing ? (
          <p className="text-lg font-bold animate-pulse">추첨 중…</p>
        ) : props.winner ? (
          <div className="text-center">
            <p className="text-[10px] text-white/70">당첨</p>
            <p className="text-xl font-black text-yellow-300 break-all">{props.winner}</p>
          </div>
        ) : (
          <p className="text-sm text-white/60 text-center">후보 {props.entries.filter((e) => e.trim()).length}명</p>
        )}
      </div>
      {props.history.length > 0 && (
        <p className="text-[9px] text-white/50 truncate mt-1">최근: {props.history.slice(0, 3).join(", ")}</p>
      )}
    </div>
  );
}

export function QuizOverlayWidget({ props }: { props: LiveOverlayQuizProps }) {
  return <LiveOverlayQuiz props={props} />;
}

export function WordGuessOverlayWidget({ props }: { props: LiveOverlayWordGuessProps }) {
  return <LiveOverlayWordGuess props={props} />;
}

export function ChosungOverlayWidget({ props }: { props: LiveOverlayChosungQuizProps }) {
  return <LiveOverlayChosungQuiz props={props} />;
}
