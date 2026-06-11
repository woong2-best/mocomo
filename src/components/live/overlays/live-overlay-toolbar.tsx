"use client";

import { CircleDot, Gift, Type, RotateCw, Sparkles, HelpCircle, MessageSquareText, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveOverlayContextOptional } from "@/components/live/overlays/live-overlay-context";
import type {
  LiveOverlayChosungQuizProps,
  LiveOverlayLotteryProps,
  LiveOverlayQuizProps,
  LiveOverlayTextProps,
  LiveOverlayWheelProps,
  LiveOverlayWordGuessProps,
} from "@/lib/live-overlays/types";
import { toChosung } from "@/lib/live-overlays/chosung";

export function LiveOverlayToolbar({ compact = false }: { compact?: boolean }) {
  const ctx = useLiveOverlayContextOptional();
  if (!ctx?.isHost) return null;

  const {
    state,
    selectedId,
    addWidget,
    updateWidget,
    updateWidgetProps,
    removeWidget,
    spinWheel,
    resetWheel,
    drawLottery,
    startQuiz,
    revealQuiz,
    resetQuizRound,
    clearQuizScores,
    startWordGuess,
    revealWordGuess,
    resetWordGuessRound,
    startChosungQuiz,
    revealChosungQuiz,
    resetChosungQuizRound,
    clearChosungQuizScores,
  } = ctx;

  const selected = state.widgets.find((w) => w.id === selectedId);

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-white/20 bg-black/70 backdrop-blur-md p-2 space-y-2 text-white"
          : "rounded-xl border border-border bg-card/95 p-3 space-y-3 shadow-sm"
      }
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`text-xs font-bold ${compact ? "text-white/90" : "text-muted-foreground"}`}>
          방송 게임
        </span>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("quiz")}>
          <HelpCircle className="h-3.5 w-3.5" />
          퀴즈
        </Button>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("chosungQuiz")}>
          <Languages className="h-3.5 w-3.5" />
          초성 퀴즈
        </Button>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("wordGuess")}>
          <MessageSquareText className="h-3.5 w-3.5" />
          단어 맞히기
        </Button>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("wheel")}>
          <CircleDot className="h-3.5 w-3.5" />
          돌림판
        </Button>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("lottery")}>
          <Gift className="h-3.5 w-3.5" />
          추첨
        </Button>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("text")}>
          <Type className="h-3.5 w-3.5" />
          텍스트
        </Button>
      </div>

      {selected && (
        <div className={`space-y-2 pt-2 border-t ${compact ? "border-white/15" : "border-border"}`}>
          <p className="text-[11px] font-medium opacity-80">
            {selected.type === "wheel"
              ? "왼쪽 아래 핸들로 위치 조절 · 툴바 크기 슬라이더 · 원 탭 또는 돌리기"
              : "선택됨 · 드래그·모서리로 크기 조절 · 휴지통으로 삭제"}
          </p>

          {selected.type === "text" && (
            <TextEditor
              props={selected.props as LiveOverlayTextProps}
              compact={compact}
              onChange={(props) => updateWidgetProps(selected.id, props)}
            />
          )}
          {selected.type === "wheel" && (
            <WheelEditor
              props={selected.props as LiveOverlayWheelProps}
              size={selected.w}
              compact={compact}
              onChange={(props) => updateWidgetProps(selected.id, props)}
              onSizeChange={(w) => updateWidget(selected.id, { w, h: w })}
              onSpin={() => spinWheel(selected.id)}
              onReset={() => resetWheel(selected.id)}
            />
          )}
          {selected.type === "lottery" && (
            <LotteryEditor
              props={selected.props as LiveOverlayLotteryProps}
              compact={compact}
              onChange={(props) => updateWidgetProps(selected.id, props)}
              onDraw={() => drawLottery(selected.id)}
            />
          )}
          {selected.type === "quiz" && (
            <QuizEditor
              props={selected.props as LiveOverlayQuizProps}
              compact={compact}
              onChange={(props) => updateWidgetProps(selected.id, props)}
              onStart={() => startQuiz(selected.id)}
              onReveal={() => revealQuiz(selected.id)}
              onReset={() => resetQuizRound(selected.id)}
              onClearScores={() => clearQuizScores(selected.id)}
            />
          )}
          {selected.type === "wordGuess" && (
            <WordGuessEditor
              props={selected.props as LiveOverlayWordGuessProps}
              compact={compact}
              onChange={(props) => updateWidgetProps(selected.id, props)}
              onStart={() => startWordGuess(selected.id)}
              onReveal={() => revealWordGuess(selected.id)}
              onReset={() => resetWordGuessRound(selected.id)}
            />
          )}
          {selected.type === "chosungQuiz" && (
            <ChosungQuizEditor
              props={selected.props as LiveOverlayChosungQuizProps}
              compact={compact}
              onChange={(props) => updateWidgetProps(selected.id, props)}
              onStart={() => startChosungQuiz(selected.id)}
              onReveal={() => revealChosungQuiz(selected.id)}
              onReset={() => resetChosungQuizRound(selected.id)}
              onClearScores={() => clearChosungQuizScores(selected.id)}
            />
          )}

          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="rounded-lg h-8 w-full"
            onClick={() => removeWidget(selected.id)}
          >
            이 오버레이 삭제
          </Button>
        </div>
      )}

      {!selected && state.widgets.length > 0 && (
        <p className={`text-[11px] ${compact ? "text-white/60" : "text-muted-foreground"}`}>
          화면의 게임·오버레이를 탭해 편집하세요. 퀴즈·단어 맞히기는 채팅으로 참여합니다.
        </p>
      )}
    </div>
  );
}

function QuizEditor({
  props,
  compact,
  onChange,
  onStart,
  onReveal,
  onReset,
  onClearScores,
}: {
  props: LiveOverlayQuizProps;
  compact: boolean;
  onChange: (p: LiveOverlayQuizProps) => void;
  onStart: () => void;
  onReveal: () => void;
  onReset: () => void;
  onClearScores: () => void;
}) {
  const inputCls = compact ? "h-8 bg-black/40 border-white/20 text-white" : "h-9";
  const textareaCls = `w-full rounded-lg border px-2 py-1.5 text-xs ${compact ? "bg-black/40 border-white/20 text-white" : "border-input bg-background"}`;

  return (
    <div className="space-y-2">
      <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} placeholder="퀴즈 제목" className={inputCls} />
      <Input value={props.question} onChange={(e) => onChange({ ...props, question: e.target.value })} placeholder="문제" className={inputCls} />
      {props.options.map((opt, i) => (
        <div key={i} className="flex gap-1 items-center">
          <span className="text-[10px] w-4 shrink-0">{i + 1}</span>
          <Input
            value={opt}
            onChange={(e) => {
              const options = [...props.options] as [string, string, string, string];
              options[i] = e.target.value;
              onChange({ ...props, options });
            }}
            placeholder={`선택 ${i + 1}`}
            className={inputCls}
          />
          <input
            type="radio"
            checked={props.correctIndex === i}
            onChange={() => onChange({ ...props, correctIndex: i })}
            title="정답"
          />
        </div>
      ))}
      <label className="text-[10px] flex items-center gap-2">
        제한 시간
        <input
          type="range"
          min={10}
          max={90}
          value={props.durationSec}
          onChange={(e) => onChange({ ...props, durationSec: Number(e.target.value) })}
        />
        {props.durationSec}초
      </label>
      <label className="text-[10px] flex items-center gap-2">
        정답 점수
        <input
          type="number"
          min={1}
          max={100}
          value={props.points}
          onChange={(e) => onChange({ ...props, points: Number(e.target.value) || 10 })}
          className="w-14 rounded border px-1"
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" className="rounded-lg h-8 flex-1" disabled={props.phase === "active"} onClick={onStart}>
          시작
        </Button>
        <Button type="button" size="sm" variant="secondary" className="rounded-lg h-8 flex-1" onClick={onReveal}>
          정답 공개
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-lg h-8 flex-1" onClick={onReset}>
          대기
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-lg h-8 flex-1" onClick={onClearScores}>
          점수 초기화
        </Button>
      </div>
      <p className="text-[10px] opacity-70">시청자: 채팅에 1~4 또는 A~D · O/X(2지선다)</p>
    </div>
  );
}

function WordGuessEditor({
  props,
  compact,
  onChange,
  onStart,
  onReveal,
  onReset,
}: {
  props: LiveOverlayWordGuessProps;
  compact: boolean;
  onChange: (p: LiveOverlayWordGuessProps) => void;
  onStart: () => void;
  onReveal: () => void;
  onReset: () => void;
}) {
  const inputCls = compact ? "h-8 bg-black/40 border-white/20 text-white" : "h-9";

  return (
    <div className="space-y-2">
      <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} placeholder="게임 제목" className={inputCls} />
      <Input value={props.category} onChange={(e) => onChange({ ...props, category: e.target.value })} placeholder="카테고리" className={inputCls} />
      <Input value={props.answer} onChange={(e) => onChange({ ...props, answer: e.target.value })} placeholder="정답 (시청자에게 숨김)" className={inputCls} />
      <Input value={props.hint} onChange={(e) => onChange({ ...props, hint: e.target.value })} placeholder="힌트" className={inputCls} />
      <label className="text-[10px] flex items-center gap-2">
        제한 시간
        <input
          type="range"
          min={15}
          max={120}
          value={props.durationSec}
          onChange={(e) => onChange({ ...props, durationSec: Number(e.target.value) })}
        />
        {props.durationSec}초
      </label>
      <div className="flex gap-1.5">
        <Button type="button" size="sm" className="rounded-lg h-8 flex-1" disabled={props.phase === "active"} onClick={onStart}>
          시작
        </Button>
        <Button type="button" size="sm" variant="secondary" className="rounded-lg h-8 flex-1" onClick={onReveal}>
          정답 공개
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-lg h-8 flex-1" onClick={onReset}>
          대기
        </Button>
      </div>
      <p className="text-[10px] opacity-70">시청자: 채팅으로 정답 입력</p>
    </div>
  );
}

function ChosungQuizEditor({
  props,
  compact,
  onChange,
  onStart,
  onReveal,
  onReset,
  onClearScores,
}: {
  props: LiveOverlayChosungQuizProps;
  compact: boolean;
  onChange: (p: LiveOverlayChosungQuizProps) => void;
  onStart: () => void;
  onReveal: () => void;
  onReset: () => void;
  onClearScores: () => void;
}) {
  const inputCls = compact ? "h-8 bg-black/40 border-white/20 text-white" : "h-9";

  return (
    <div className="space-y-2">
      <Input value={props.title} onChange={(e) => onChange({ ...props, title: e.target.value })} placeholder="게임 제목" className={inputCls} />
      <Input value={props.category} onChange={(e) => onChange({ ...props, category: e.target.value })} placeholder="카테고리" className={inputCls} />
      <Input
        value={props.answer}
        onChange={(e) => {
          const answer = e.target.value;
          onChange({ ...props, answer, chosung: toChosung(answer) });
        }}
        placeholder="정답 (초성 자동 생성)"
        className={inputCls}
      />
      {props.chosung && (
        <p className="text-center text-lg font-black tracking-widest text-sky-300 py-1">
          {props.chosung}
        </p>
      )}
      <Input value={props.hint} onChange={(e) => onChange({ ...props, hint: e.target.value })} placeholder="추가 힌트 (선택)" className={inputCls} />
      <label className="text-[10px] flex items-center gap-2">
        제한 시간
        <input
          type="range"
          min={15}
          max={90}
          value={props.durationSec}
          onChange={(e) => onChange({ ...props, durationSec: Number(e.target.value) })}
        />
        {props.durationSec}초
      </label>
      <label className="text-[10px] flex items-center gap-2">
        정답 점수
        <input
          type="number"
          min={1}
          max={100}
          value={props.points}
          onChange={(e) => onChange({ ...props, points: Number(e.target.value) || 10 })}
          className="w-14 rounded border px-1"
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" className="rounded-lg h-8 flex-1" disabled={props.phase === "active"} onClick={onStart}>
          시작
        </Button>
        <Button type="button" size="sm" variant="secondary" className="rounded-lg h-8 flex-1" onClick={onReveal}>
          정답 공개
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-lg h-8 flex-1" onClick={onReset}>
          대기
        </Button>
        <Button type="button" size="sm" variant="outline" className="rounded-lg h-8 flex-1" onClick={onClearScores}>
          점수 초기화
        </Button>
      </div>
      <p className="text-[10px] opacity-70">시청자: 초성을 보고 채팅으로 정답 단어 입력</p>
    </div>
  );
}

function TextEditor({
  props,
  compact,
  onChange,
}: {
  props: LiveOverlayTextProps;
  compact: boolean;
  onChange: (p: LiveOverlayTextProps) => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        value={props.content}
        onChange={(e) => onChange({ ...props, content: e.target.value })}
        placeholder="표시할 문구"
        className={compact ? "h-8 bg-black/40 border-white/20 text-white" : "h-9"}
      />
      <div className="flex flex-wrap gap-2">
        <label className="text-[10px] flex items-center gap-1">
          크기
          <input
            type="range"
            min={14}
            max={56}
            value={props.fontSize}
            onChange={(e) => onChange({ ...props, fontSize: Number(e.target.value) })}
          />
        </label>
        <input
          type="color"
          value={props.color}
          onChange={(e) => onChange({ ...props, color: e.target.value })}
          title="글자색"
        />
        <label className="text-[10px] flex items-center gap-1">
          <input
            type="checkbox"
            checked={props.bold}
            onChange={(e) => onChange({ ...props, bold: e.target.checked })}
          />
          굵게
        </label>
      </div>
    </div>
  );
}

function WheelEditor({
  props,
  size,
  compact,
  onChange,
  onSizeChange,
  onSpin,
  onReset,
}: {
  props: LiveOverlayWheelProps;
  size: number;
  compact: boolean;
  onChange: (p: LiveOverlayWheelProps) => void;
  onSizeChange: (w: number) => void;
  onSpin: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] flex items-center gap-2">
        크기
        <input
          type="range"
          min={14}
          max={45}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="flex-1"
        />
      </label>
      <textarea
        value={props.segments.map((s) => s.label).join("\n")}
        onChange={(e) => {
          const labels = e.target.value.split("\n");
          onChange({
            ...props,
            segments: labels.map((label, i) => ({
              id: props.segments[i]?.id ?? String(i + 1),
              label,
              weight: 1,
            })),
          });
        }}
        rows={6}
        placeholder={"항목 (한 줄에 하나)\n1\n2\n3\n4"}
        className={`w-full rounded-lg border px-2 py-1.5 text-xs ${compact ? "bg-black/40 border-white/20 text-white" : "border-input bg-background"}`}
      />
      <div className="flex gap-1.5">
        <Button type="button" size="sm" className="rounded-lg h-8 gap-1 flex-1" disabled={props.spinning} onClick={onSpin}>
          <RotateCw className={`h-3.5 w-3.5 ${props.spinning ? "animate-spin" : ""}`} />
          돌리기
        </Button>
        <Button type="button" size="sm" variant="secondary" className="rounded-lg h-8 flex-1" disabled={props.spinning} onClick={onReset}>
          초기화
        </Button>
      </div>
    </div>
  );
}

function LotteryEditor({
  props,
  compact,
  onChange,
  onDraw,
}: {
  props: LiveOverlayLotteryProps;
  compact: boolean;
  onChange: (p: LiveOverlayLotteryProps) => void;
  onDraw: () => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        value={props.title}
        onChange={(e) => onChange({ ...props, title: e.target.value })}
        placeholder="추첨 제목"
        className={compact ? "h-8 bg-black/40 border-white/20 text-white" : "h-9"}
      />
      <textarea
        value={props.entries.join("\n")}
        onChange={(e) => onChange({ ...props, entries: e.target.value.split("\n") })}
        rows={5}
        placeholder={"후보 (한 줄에 하나)\n닉네임1\n닉네임2"}
        className={`w-full rounded-lg border px-2 py-1.5 text-xs ${compact ? "bg-black/40 border-white/20 text-white" : "border-input bg-background"}`}
      />
      <label className="text-[10px] flex items-center gap-1">
        <input
          type="checkbox"
          checked={props.removeWinner}
          onChange={(e) => onChange({ ...props, removeWinner: e.target.checked })}
        />
        당첨 후 목록에서 제거
      </label>
      <Button type="button" size="sm" className="rounded-lg h-8 gap-1 w-full" disabled={props.drawing} onClick={onDraw}>
        <Sparkles className="h-3.5 w-3.5" />
        추첨하기
      </Button>
    </div>
  );
}
