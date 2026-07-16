import { cn } from "@/lib/utils";

/** 차트 자리만 — 실제 데이터 연동은 이후 단계 */
export function ChartPlaceholder({
  title,
  bars = [42, 58, 35, 70, 48, 82, 61],
  className,
}: {
  title: string;
  bars?: number[];
  className?: string;
}) {
  const max = Math.max(...bars, 1);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card p-4 shadow-sm dark:bg-zinc-900/60 sm:p-5",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-muted-foreground">더미 차트 · 연동 예정</p>
        </div>
        <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground">
          Placeholder
        </span>
      </div>

      <div className="flex h-40 items-end gap-2 sm:gap-3">
        {bars.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-indigo-600/80 to-indigo-400/70 dark:from-indigo-500/70 dark:to-indigo-300/50"
              style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
            />
            <span className="text-[10px] text-muted-foreground">D{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
