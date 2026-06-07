"use client";

import { CircleDot, Gift, Type, RotateCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveOverlayContextOptional } from "@/components/live/overlays/live-overlay-context";
import type {
  LiveOverlayLotteryProps,
  LiveOverlayTextProps,
  LiveOverlayWheelProps,
} from "@/lib/live-overlays/types";

export function LiveOverlayToolbar({ compact = false }: { compact?: boolean }) {
  const ctx = useLiveOverlayContextOptional();
  if (!ctx?.isHost) return null;

  const {
    state,
    selectedId,
    addWidget,
    updateWidgetProps,
    removeWidget,
    spinWheel,
    drawLottery,
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
          방송 오버레이
        </span>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("text")}>
          <Type className="h-3.5 w-3.5" />
          텍스트
        </Button>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("wheel")}>
          <CircleDot className="h-3.5 w-3.5" />
          돌림판
        </Button>
        <Button type="button" size="sm" variant={compact ? "secondary" : "outline"} className="rounded-lg h-8 gap-1" onClick={() => addWidget("lottery")}>
          <Gift className="h-3.5 w-3.5" />
          추첨
        </Button>
      </div>

      {selected && (
        <div className={`space-y-2 pt-2 border-t ${compact ? "border-white/15" : "border-border"}`}>
          <p className="text-[11px] font-medium opacity-80">
            선택됨 · 드래그·모서리로 크기 조절 · 휴지통으로 삭제
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
              compact={compact}
              onChange={(props) => updateWidgetProps(selected.id, props)}
              onSpin={() => spinWheel(selected.id)}
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
          화면의 오버레이를 탭해 편집하세요. 시청자에게 실시간 동기화됩니다.
        </p>
      )}
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
  compact,
  onChange,
  onSpin,
}: {
  props: LiveOverlayWheelProps;
  compact: boolean;
  onChange: (p: LiveOverlayWheelProps) => void;
  onSpin: () => void;
}) {
  return (
    <div className="space-y-2">
      <Input
        value={props.title}
        onChange={(e) => onChange({ ...props, title: e.target.value })}
        placeholder="돌림판 제목"
        className={compact ? "h-8 bg-black/40 border-white/20 text-white" : "h-9"}
      />
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
        rows={4}
        placeholder={"항목 (한 줄에 하나)\n1\n2\n3"}
        className={`w-full rounded-lg border px-2 py-1.5 text-xs ${compact ? "bg-black/40 border-white/20 text-white" : "border-input bg-background"}`}
      />
      <Button type="button" size="sm" className="rounded-lg h-8 gap-1 w-full" disabled={props.spinning} onClick={onSpin}>
        <RotateCw className={`h-3.5 w-3.5 ${props.spinning ? "animate-spin" : ""}`} />
        돌리기
      </Button>
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
