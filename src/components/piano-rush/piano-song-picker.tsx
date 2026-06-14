"use client";

import { listChartsForPicker } from "@/lib/minigames/piano-rush-charts";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (chartId: string) => void;
  className?: string;
};

const CHARTS = listChartsForPicker();
const AUDIO = CHARTS.filter((c) => c.hasAudio);
const SYNTH = CHARTS.filter((c) => !c.hasAudio);

function ChartRow({
  c,
  value,
  onChange,
}: {
  c: (typeof CHARTS)[number];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(c.id)}
      className={cn(
        "w-full text-left px-3 py-2.5 text-sm transition-colors hover:bg-violet-500/10",
        value === c.id && "bg-violet-500/20 ring-1 ring-inset ring-violet-500/40"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium truncate">{c.title}</span>
        <span className="shrink-0 flex items-center gap-1">
          {c.hasAudio && (
            <span className="text-[10px] rounded px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
              연주
            </span>
          )}
          <span className="text-[10px] rounded px-1.5 py-0.5 bg-muted text-muted-foreground">{c.difficulty}</span>
        </span>
      </div>
      <p className="text-xs text-muted-foreground truncate mt-0.5">
        {c.artist} · 약 {c.durationSec}초
        {c.license ? ` · ${c.license}` : ""}
      </p>
    </button>
  );
}

export function PianoSongPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium">곡 선택</label>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Musopen CC PD</span>
      </div>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-violet-500/20 divide-y divide-white/5">
        {AUDIO.length > 0 && (
          <>
            <p className="sticky top-0 z-10 bg-background/95 px-3 py-1.5 text-[10px] font-semibold text-violet-300 uppercase tracking-wide">
              실제 연주 ({AUDIO.length})
            </p>
            {AUDIO.map((c) => (
              <ChartRow key={c.id} c={c} value={value} onChange={onChange} />
            ))}
          </>
        )}
        {SYNTH.length > 0 && (
          <>
            <p className="sticky top-0 z-10 bg-background/95 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              합성 멜로디 ({SYNTH.length})
            </p>
            {SYNTH.map((c) => (
              <ChartRow key={c.id} c={c} value={value} onChange={onChange} />
            ))}
          </>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        CC PD 녹음곡은 게임 시작과 동시에 MP3가 재생됩니다. 소리가 안 나면 화면을 한 번 탭한 뒤 다시 시도하세요.
      </p>
    </div>
  );
}
