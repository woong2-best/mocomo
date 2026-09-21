"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIdleCallback } from "@/hooks/use-idle-callback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StickyMemoDialog } from "@/components/layout/sticky-memo-dialog";
import { useLocale } from "@/components/providers/locale-provider";
import {
  buildMonthGrid,
  dateKey,
  monthEn,
  sexagenaryYear,
  weekdayLabels,
  type CalendarCell,
} from "@/lib/calendar/kr-calendar";
import { formatScheduleMemo } from "@/lib/live-broadcast/weekly-schedule";
import {
  detectBrowserTimeZone,
  normalizeTimeZone,
  todayPartsInTimeZone,
} from "@/lib/i18n/timezone";
import { cn } from "@/lib/utils";

type MemosMap = Record<string, string>;

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function profileUsernameFromPath(pathname: string | null): string | null {
  if (!pathname) return null;
  const m = pathname.match(/^\/u\/([^/]+)/);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

type MemoTarget =
  | { kind: "day"; cell: CalendarCell }
  | { kind: "weekday"; weekday: number };

export function ProfileCalendar() {
  const pathname = usePathname();
  const profileUsername = profileUsernameFromPath(pathname);
  const { t, timeZone: localeTimeZone, countryCode } = useLocale();
  const session = useSession();
  const signedIn = Boolean(session?.data?.user?.id);
  const timeZone = useMemo(
    () =>
      normalizeTimeZone(
        session?.data?.user?.timeZone || localeTimeZone || detectBrowserTimeZone()
      ),
    [session?.data?.user?.timeZone, localeTimeZone]
  );
  const today = useMemo(() => todayPartsInTimeZone(timeZone), [timeZone]);
  const showKrHolidays = countryCode.toUpperCase() === "KR";

  const [year, setYear] = useState(today.y);
  const [month, setMonth] = useState(today.m);
  const [memos, setMemos] = useState<MemosMap>({});
  const [scheduleWeekdays, setScheduleWeekdays] = useState<Set<number>>(new Set());
  const [scheduleTime, setScheduleTime] = useState<string | null>(null);
  const [scheduleNote, setScheduleNote] = useState<string | null>(null);
  const [canEditDays, setCanEditDays] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(today.y);
  const [target, setTarget] = useState<MemoTarget | null>(null);
  const [memoDraft, setMemoDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setYear(today.y);
    setMonth(today.m);
    setPickerYear(today.y);
  }, [today.y, today.m]);

  const cells = useMemo(
    () => buildMonthGrid(year, month, { holidays: showKrHolidays }),
    [year, month, showKrHolidays]
  );
  const weekdays = useMemo(() => weekdayLabels(), []);

  const loadMemos = useCallback(async () => {
    if (!profileUsername && !signedIn) {
      setMemos({});
      setScheduleWeekdays(new Set());
      setScheduleTime(null);
      setScheduleNote(null);
      setCanEditDays(false);
      return;
    }
    setLoadError(false);
    try {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
      });
      if (profileUsername) params.set("username", profileUsername);

      const res = await fetch(`/api/calendar/memos?${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data = (await res.json()) as {
        memos?: MemosMap;
        scheduleWeekdays?: number[];
        scheduleTime?: string | null;
        scheduleNote?: string | null;
        canEdit?: boolean;
      };
      setMemos(data.memos ?? {});
      setScheduleWeekdays(new Set(data.scheduleWeekdays ?? []));
      setScheduleTime(data.scheduleTime ?? null);
      setScheduleNote(data.scheduleNote ?? null);
      setCanEditDays(Boolean(data.canEdit));
    } catch {
      setLoadError(true);
    }
  }, [signedIn, year, month, profileUsername]);

  useIdleCallback(() => {
    void loadMemos();
  }, [loadMemos]);

  const openDay = (cell: CalendarCell) => {
    if (!cell.inMonth) {
      setYear(cell.y);
      setMonth(cell.m);
    }
    setTarget({ kind: "day", cell });
    setMemoDraft(memos[dateKey(cell.y, cell.m, cell.d)] ?? "");
  };

  const openWeekday = (weekday: number) => {
    setTarget({ kind: "weekday", weekday });
    setMemoDraft(
      formatScheduleMemo({
        weekdays: [...scheduleWeekdays].sort((a, b) => a - b),
        time: scheduleTime,
        note: scheduleNote,
      })
    );
  };

  const saveMemo = async () => {
    if (!target || target.kind !== "day" || !canEditDays) return;
    setSaving(true);
    const key = dateKey(target.cell.y, target.cell.m, target.cell.d);
    try {
      const res = await fetch("/api/calendar/memos", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: key, body: memoDraft }),
      });
      if (!res.ok) return;
      const trimmed = memoDraft.replace(/^\s+|\s+$/g, "");
      setMemos((prev) => {
        const next = { ...prev };
        if (trimmed) next[key] = trimmed;
        else delete next[key];
        return next;
      });
      setTarget(null);
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

  const memoTitle =
    target?.kind === "day"
      ? `${target.cell.y}.${String(target.cell.m).padStart(2, "0")}.${String(target.cell.d).padStart(2, "0")}`
      : target?.kind === "weekday"
        ? `매주 ${WEEKDAY_KO[target.weekday]}`
        : "";

  const memoSubtitle =
    target?.kind === "day"
      ? (target.cell.holiday ?? null)
      : target?.kind === "weekday"
        ? "방송 일정 · 라이브 스튜디오에서 수정"
        : null;

  const editingDay = target?.kind === "day" && canEditDays;

  return (
    <div className="shrink-0 w-full bg-card border-b border-border overflow-hidden">
      <div className="px-1.5 pt-3 pb-1 text-center">
        <button
          type="button"
          onClick={() => {
            setPickerYear(year);
            setMonthPickerOpen(true);
          }}
          className="mx-auto block leading-none text-[2.75rem] font-serif font-bold text-[#c41e3a] dark:text-red-400 tracking-tight hover:opacity-80 active:scale-[0.98] transition-opacity"
          aria-label={t("calendar.pickMonth")}
        >
          {month}
        </button>
        <p className="mt-0.5 text-[11px] font-semibold tracking-[0.12em] text-foreground/80">
          {year} {monthEn(month)}{" "}
          <span className="font-serif tracking-normal text-muted-foreground">{sexagenaryYear(year)}</span>
        </p>
        <p className="mt-0.5 text-[9px] font-medium text-muted-foreground/80 tabular-nums" title={timeZone}>
          {timeZone}
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
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-folk-cobalt dark:text-folk-gold hover:bg-muted"
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

      {/* Weekday headers only — light green for broadcast days; clickable */}
      <div className="grid grid-cols-7 border-t border-border">
        {weekdays.map((w, i) => {
          const isScheduleHeader = scheduleWeekdays.has(i);
          return (
            <button
              key={w.en}
              type="button"
              onClick={() => openWeekday(i)}
              className={cn(
                "flex flex-col items-center py-1.5 border-r border-border last:border-r-0 transition-colors hover:bg-muted/40",
                isScheduleHeader && "bg-lime-500/35 dark:bg-lime-400/25",
                i === 0 && "text-[#c41e3a] dark:text-red-400",
                i === 6 && !isScheduleHeader && "text-[#1d4ed8] dark:text-sky-400",
                i === 6 && isScheduleHeader && "text-sky-100",
                i > 0 && i < 6 && "text-foreground"
              )}
              aria-label={`${w.han} ${w.en} 메모`}
            >
              <span className="text-sm font-serif font-bold leading-none">{w.han}</span>
              <span className="mt-0.5 text-[8px] font-semibold tracking-wide opacity-70">{w.en}</span>
            </button>
          );
        })}
      </div>

      {/* Date grid — no green columns, no memo dots */}
      <div className="grid grid-cols-7 border-t border-border">
        {cells.map((cell) => {
          const key = dateKey(cell.y, cell.m, cell.d);
          const isToday =
            cell.inMonth && cell.y === today.y && cell.m === today.m && cell.d === today.d;
          const isSelected =
            target?.kind === "day" &&
            dateKey(target.cell.y, target.cell.m, target.cell.d) === key &&
            target.cell.inMonth === cell.inMonth;

          return (
            <button
              key={`${key}-${cell.inMonth ? "cur" : "adj"}`}
              type="button"
              onClick={() => openDay(cell)}
              className={cn(
                "relative min-h-[3.35rem] xl:min-h-[3.6rem] border-r border-b border-border p-0.5 text-left transition-colors last:border-r-0 hover:bg-muted/50",
                !cell.inMonth && "bg-muted/25",
                isSelected && "bg-accent/20 ring-1 ring-inset ring-ring/40",
                isToday && "bg-muted/70"
              )}
            >
              <span
                className={cn(
                  "block text-center text-[13px] xl:text-sm font-serif font-bold leading-tight tabular-nums",
                  !cell.inMonth && "text-muted-foreground/50",
                  cell.inMonth && cell.isRed && "text-[#c41e3a] dark:text-red-400",
                  cell.inMonth && cell.isBlue && "text-[#1d4ed8] dark:text-sky-400",
                  cell.inMonth && !cell.isRed && !cell.isBlue && "text-foreground"
                )}
              >
                {cell.d}
              </span>
              {cell.inMonth && cell.holiday ? (
                <span
                  className={cn(
                    "mt-0.5 block truncate px-0.5 text-center text-[7px] xl:text-[8px] font-medium leading-tight",
                    cell.isRed
                      ? "text-[#c41e3a]/90 dark:text-red-400/90"
                      : "text-muted-foreground"
                  )}
                  title={cell.holiday}
                >
                  {cell.holiday}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {loadError ? (
        <p className="px-2 py-1 text-[10px] text-muted-foreground">{t("calendar.loadError")}</p>
      ) : null}

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
            <span className="text-base font-display font-bold text-folk-cobalt dark:text-folk-gold">
              {pickerYear}
            </span>
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
                      ? "border-red-500/50 bg-red-500/10 text-[#c41e3a] dark:text-red-400"
                      : "border-border bg-card text-foreground hover:border-folk-terracotta/40 hover:bg-muted"
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <StickyMemoDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={memoTitle}
        subtitle={memoSubtitle}
        value={memoDraft}
        onChange={setMemoDraft}
        canEdit={editingDay}
        onSave={() => void saveMemo()}
        saving={saving}
        cancelLabel={t("calendar.cancel")}
        saveLabel={t("calendar.save")}
        savingLabel={t("calendar.saving")}
        placeholder={t("calendar.memoPlaceholder")}
        readOnlyHint={
          target?.kind === "weekday"
            ? scheduleWeekdays.size > 0
              ? undefined
              : "라이브 스튜디오에서 방송 요일·메모를 설정하세요."
            : canEditDays
              ? undefined
              : signedIn
                ? t("calendar.memoHint")
                : t("calendar.loginRequired")
        }
      />
    </div>
  );
}
