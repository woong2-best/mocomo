"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/components/providers/locale-provider";
import {
  buildMonthGrid,
  dateKey,
  monthEn,
  sexagenaryYear,
  weekdayLabels,
  type CalendarCell,
} from "@/lib/calendar/kr-calendar";
import { cn } from "@/lib/utils";

type MemosMap = Record<string, string>;

function todayParts() {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

export function ProfileCalendar() {
  const { t } = useLocale();
  const session = useSession();
  const signedIn = Boolean(session?.data?.user?.id);
  const today = useMemo(() => todayParts(), []);

  const [year, setYear] = useState(today.y);
  const [month, setMonth] = useState(today.m);
  const [memos, setMemos] = useState<MemosMap>({});
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.y);
  const [selected, setSelected] = useState<CalendarCell | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const weekdays = useMemo(() => weekdayLabels(), []);

  const loadMemos = useCallback(async () => {
    if (!signedIn) {
      setMemos({});
      return;
    }
    setLoadError(false);
    try {
      const res = await fetch(`/api/calendar/memos?year=${year}&month=${month}`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data = (await res.json()) as { memos?: MemosMap };
      setMemos(data.memos ?? {});
    } catch {
      setLoadError(true);
    }
  }, [signedIn, year, month]);

  useEffect(() => {
    void loadMemos();
  }, [loadMemos]);

  const openDay = (cell: CalendarCell) => {
    if (!cell.inMonth) {
      setYear(cell.y);
      setMonth(cell.m);
    }
    setSelected(cell);
    setMemoDraft(memos[dateKey(cell.y, cell.m, cell.d)] ?? "");
  };

  const saveMemo = async () => {
    if (!selected || !signedIn) return;
    setSaving(true);
    const key = dateKey(selected.y, selected.m, selected.d);
    try {
      const res = await fetch("/api/calendar/memos", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: key, body: memoDraft }),
      });
      if (!res.ok) return;
      const trimmed = memoDraft.trim();
      setMemos((prev) => {
        const next = { ...prev };
        if (trimmed) next[key] = trimmed;
        else delete next[key];
        return next;
      });
      setSelected(null);
    } finally {
      setSaving(false);
    }
  };

  const applyMonth = (m: number) => {
    setYear(pickerYear);
    setMonth(m);
    setMonthPickerOpen(false);
  };

  const goToday = () => {
    setYear(today.y);
    setMonth(today.m);
  };

  const selectedKey = selected ? dateKey(selected.y, selected.m, selected.d) : null;

  return (
    <div className="shrink-0 rounded-xl border-2 border-folk-cobalt/20 bg-white shadow-[2px_3px_0_hsl(var(--folk-cobalt)/0.08)] overflow-hidden">
      {/* Header — red month number opens picker */}
      <div className="px-2 pt-3 pb-1 text-center">
        <button
          type="button"
          onClick={() => {
            setPickerYear(year);
            setMonthPickerOpen(true);
          }}
          className="mx-auto block leading-none text-[2.75rem] font-serif font-bold text-[#c41e3a] tracking-tight hover:opacity-80 active:scale-[0.98] transition-opacity"
          aria-label={t("calendar.pickMonth")}
        >
          {month}
        </button>
        <p className="mt-0.5 text-[11px] font-semibold tracking-[0.12em] text-foreground/80">
          {year} {monthEn(month)}{" "}
          <span className="font-serif tracking-normal text-muted-foreground">{sexagenaryYear(year)}</span>
        </p>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (month === 1) {
                setYear((y) => y - 1);
                setMonth(12);
              } else setMonth((m) => m - 1);
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("calendar.prevMonth")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-folk-cobalt hover:bg-folk-cream"
          >
            {t("calendar.today")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (month === 12) {
                setYear((y) => y + 1);
                setMonth(1);
              } else setMonth((m) => m + 1);
            }}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("calendar.nextMonth")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-t border-border/60">
        {weekdays.map((w, i) => (
          <div
            key={w.en}
            className={cn(
              "flex flex-col items-center py-1.5 border-r border-border/50 last:border-r-0",
              i === 0 && "text-[#c41e3a]",
              i === 6 && "text-[#1d4ed8]",
              i > 0 && i < 6 && "text-foreground"
            )}
          >
            <span className="text-sm font-serif font-bold leading-none">{w.han}</span>
            <span className="mt-0.5 text-[8px] font-semibold tracking-wide opacity-70">{w.en}</span>
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 border-t border-border/60">
        {cells.map((cell) => {
          const key = dateKey(cell.y, cell.m, cell.d);
          const hasMemo = Boolean(memos[key]);
          const isToday =
            cell.inMonth && cell.y === today.y && cell.m === today.m && cell.d === today.d;
          const isSelected = selectedKey === key && selected?.inMonth === cell.inMonth;

          return (
            <button
              key={`${key}-${cell.inMonth ? "cur" : "adj"}`}
              type="button"
              onClick={() => openDay(cell)}
              className={cn(
                "relative min-h-[3.35rem] xl:min-h-[3.6rem] border-r border-b border-border/50 p-0.5 text-left transition-colors last:border-r-0 hover:bg-folk-cream/70",
                !cell.inMonth && "bg-muted/20",
                isSelected && "bg-folk-gold/15 ring-1 ring-inset ring-folk-cobalt/30",
                isToday && "bg-folk-cream/90"
              )}
            >
              <span
                className={cn(
                  "block text-center text-[13px] xl:text-sm font-serif font-bold leading-tight tabular-nums",
                  !cell.inMonth && "text-muted-foreground/45",
                  cell.inMonth && cell.isRed && "text-[#c41e3a]",
                  cell.inMonth && cell.isBlue && "text-[#1d4ed8]",
                  cell.inMonth && !cell.isRed && !cell.isBlue && "text-foreground"
                )}
              >
                {cell.d}
              </span>
              {cell.inMonth && cell.holiday ? (
                <span
                  className={cn(
                    "mt-0.5 block truncate px-0.5 text-center text-[7px] xl:text-[8px] font-medium leading-tight",
                    cell.isRed ? "text-[#c41e3a]/90" : "text-muted-foreground"
                  )}
                  title={cell.holiday}
                >
                  {cell.holiday}
                </span>
              ) : null}
              {hasMemo && cell.inMonth ? (
                <span
                  className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-folk-terracotta"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {loadError ? (
        <p className="px-2 py-1 text-[10px] text-muted-foreground">{t("calendar.loadError")}</p>
      ) : null}

      {/* Month picker */}
      <Dialog open={monthPickerOpen} onOpenChange={setMonthPickerOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("calendar.pickMonth")}</DialogTitle>
            <DialogDescription className="sr-only">{t("calendar.pickMonthHint")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-muted"
              onClick={() => setPickerYear((y) => y - 1)}
              aria-label={t("calendar.prevYear")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-base font-display font-bold text-folk-cobalt">{pickerYear}</span>
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-muted"
              onClick={() => setPickerYear((y) => y + 1)}
              aria-label={t("calendar.nextYear")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const active = pickerYear === year && m === month;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => applyMonth(m)}
                  className={cn(
                    "rounded-xl border-2 py-3 text-center font-serif text-xl font-bold transition-all",
                    active
                      ? "border-[#c41e3a]/50 bg-[#c41e3a]/10 text-[#c41e3a]"
                      : "border-folk-cobalt/15 bg-white text-foreground hover:border-folk-terracotta/40 hover:bg-folk-cream"
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Day memo sheet */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-sm">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">
                  <span
                    className={cn(
                      selected.isRed && "text-[#c41e3a]",
                      selected.isBlue && "text-[#1d4ed8]",
                      !selected.isRed && !selected.isBlue && "text-foreground"
                    )}
                  >
                    {selected.y}.{String(selected.m).padStart(2, "0")}.{String(selected.d).padStart(2, "0")}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  {selected.holiday ?? t("calendar.memoHint")}
                </DialogDescription>
              </DialogHeader>
              {signedIn ? (
                <>
                  <Textarea
                    value={memoDraft}
                    onChange={(e) => setMemoDraft(e.target.value)}
                    placeholder={t("calendar.memoPlaceholder")}
                    rows={5}
                    maxLength={2000}
                    className="min-h-[7.5rem] resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
                    >
                      {t("calendar.cancel")}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveMemo()}
                      className="rounded-xl bg-folk-terracotta px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-folk-terracotta-dark disabled:opacity-60"
                    >
                      {saving ? t("calendar.saving") : t("calendar.save")}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("calendar.loginRequired")}</p>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
