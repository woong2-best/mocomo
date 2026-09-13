"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { AppleWheelPicker } from "@/components/ui/apple-wheel-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  defaultSponsoredAdStartTime,
  formatSponsoredAdDateTime,
  roundUpToNextFiveMinutes,
  sponsoredAdScheduleSummary,
  validateSponsoredAdSchedule,
} from "@/lib/sponsored-ad/schedule";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type SponsoredAdSchedulePickerProps = {
  startTime: Date;
  days: number;
  maxDays: number;
  onChange: (startTime: Date, days: number) => void;
  disabled?: boolean;
};

function clampStartTime(candidate: Date, minTime: Date): Date {
  let d = roundUpToNextFiveMinutes(candidate);
  if (d.getTime() < minTime.getTime()) {
    d = roundUpToNextFiveMinutes(minTime);
  }
  return d;
}

function isDayDisabled(day: Date, minTime: Date): boolean {
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return dayEnd.getTime() < minTime.getTime();
}

function isHourDisabled(day: Date, hour: number, minTime: Date): boolean {
  const slot = new Date(day);
  slot.setHours(hour, 59, 59, 999);
  return slot.getTime() < minTime.getTime();
}

function isMinuteDisabled(day: Date, hour: number, minute: number, minTime: Date): boolean {
  const slot = new Date(day);
  slot.setHours(hour, minute, 0, 0);
  return slot.getTime() < minTime.getTime();
}

export function SponsoredAdSchedulePicker({
  startTime,
  days,
  maxDays,
  onChange,
  disabled,
}: SponsoredAdSchedulePickerProps) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [draftDate, setDraftDate] = useState(() => startOfDay(startTime));
  const [draftHour, setDraftHour] = useState(() => startTime.getHours());
  const [draftMinute, setDraftMinute] = useState(() => startTime.getMinutes());
  const [draftDays, setDraftDays] = useState(days);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(startTime));
  const [error, setError] = useState("");

  const minTime = useMemo(() => defaultSponsoredAdStartTime(now), [now]);
  const dayOptions = useMemo(
    () => Array.from({ length: Math.max(1, maxDays) }, (_, i) => i + 1),
    [maxDays]
  );

  const summary = useMemo(
    () => sponsoredAdScheduleSummary(startTime, days),
    [startTime, days]
  );

  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    const clamped = clampStartTime(startTime, defaultSponsoredAdStartTime());
    setDraftDate(startOfDay(clamped));
    setDraftHour(clamped.getHours());
    setDraftMinute(clamped.getMinutes() - (clamped.getMinutes() % 5));
    setDraftDays(days);
    setViewMonth(startOfMonth(clamped));
    setError("");
  }, [open, startTime, days]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const daysInMonth = eachDayOfInterval({ start, end });
    const pad = start.getDay();
    const leading = Array.from({ length: pad }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() - (pad - i));
      return d;
    });
    return [...leading, ...daysInMonth];
  }, [viewMonth]);

  const availableHours = useMemo(
    () => HOURS.filter((h) => !isHourDisabled(draftDate, h, minTime)),
    [draftDate, minTime]
  );

  const availableMinutes = useMemo(
    () =>
      MINUTES.filter((m) => !isMinuteDisabled(draftDate, draftHour, m, minTime)),
    [draftDate, draftHour, minTime]
  );

  useEffect(() => {
    if (!availableHours.includes(draftHour) && availableHours.length > 0) {
      setDraftHour(availableHours[0]);
    }
  }, [availableHours, draftHour]);

  useEffect(() => {
    if (!availableMinutes.includes(draftMinute) && availableMinutes.length > 0) {
      setDraftMinute(availableMinutes[0]);
    }
  }, [availableMinutes, draftMinute]);

  function applyDraft() {
    const candidate = new Date(draftDate);
    candidate.setHours(draftHour, draftMinute, 0, 0);
    const clamped = clampStartTime(candidate, minTime);
    const err = validateSponsoredAdSchedule(clamped, draftDays, new Date());
    if (err) {
      setError(err);
      return;
    }
    onChange(clamped, draftDays);
    setOpen(false);
  }

  const draftSummary = useMemo(() => {
    try {
      const candidate = new Date(draftDate);
      candidate.setHours(draftHour, draftMinute, 0, 0);
      return sponsoredAdScheduleSummary(clampStartTime(candidate, minTime), draftDays);
    } catch {
      return null;
    }
  }, [draftDate, draftHour, draftMinute, draftDays, minTime]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">게재 시작 일시</label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-muted/30 px-4 py-3.5 text-left transition-colors",
            "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30",
            disabled && "opacity-50 pointer-events-none"
          )}
        >
          <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{formatSponsoredAdDateTime(startTime)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">탭하여 날짜·시간 선택</p>
          </div>
        </button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">게재 기간</span>
          <span className="font-semibold tabular-nums">{days}일 (24시간 × {days})</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">종료 일시</span>
          <span className="font-medium tabular-nums text-foreground">{summary.endLabel}</span>
        </div>
        <div className="flex items-center justify-between text-sm pt-1 border-t border-border/50">
          <span className="text-muted-foreground">차감 MOCO</span>
          <span className="font-bold text-primary tabular-nums">{summary.moco} MOCO</span>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent layer="stack" className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>게재 일시 설정</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_auto] gap-0 border-y border-border/60">
            <div className="border-r border-border/60 p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-semibold">
                  {format(viewMonth, "yyyy년 M월", { locale: ko })}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground mb-1">
                {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const selected = isSameDay(day, draftDate);
                  const dayDisabled = isDayDisabled(day, minTime);
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={dayDisabled}
                      onClick={() => setDraftDate(startOfDay(day))}
                      className={cn(
                        "aspect-square rounded-full text-xs transition-colors",
                        !inMonth && "text-muted-foreground/40",
                        dayDisabled && "opacity-30 cursor-not-allowed",
                        selected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-muted/80"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex w-[148px] shrink-0 bg-muted/10">
              <AppleWheelPicker
                items={availableHours.length > 0 ? availableHours : HOURS}
                value={availableHours.includes(draftHour) ? draftHour : (availableHours[0] ?? 0)}
                onChange={setDraftHour}
                format={(h) => String(h).padStart(2, "0")}
              />
              <AppleWheelPicker
                items={availableMinutes.length > 0 ? availableMinutes : MINUTES}
                value={
                  availableMinutes.includes(draftMinute)
                    ? draftMinute
                    : (availableMinutes[0] ?? 0)
                }
                onChange={setDraftMinute}
                format={(m) => String(m).padStart(2, "0")}
              />
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">게재 기간 (24시간 단위)</p>
              <AppleWheelPicker
                items={dayOptions}
                value={Math.min(draftDays, maxDays)}
                onChange={setDraftDays}
                format={(d) => `${d}일 · ${d} MOCO`}
                className="h-[140px]"
              />
            </div>

            {draftSummary ? (
              <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-xs space-y-1">
                <p>
                  <span className="text-muted-foreground">시작</span>{" "}
                  <span className="font-medium">{draftSummary.startLabel}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">종료</span>{" "}
                  <span className="font-medium">{draftSummary.endLabel}</span>
                </p>
              </div>
            ) : null}

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setOpen(false)}>
                취소
              </Button>
              <Button type="button" className="flex-1 rounded-xl" onClick={applyDraft}>
                적용
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
