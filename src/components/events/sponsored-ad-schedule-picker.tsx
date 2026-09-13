"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppleWheelPicker } from "@/components/ui/apple-wheel-picker";
import { Button } from "@/components/ui/button";
import {
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS,
} from "@/lib/sponsored-ad/constants";
import {
  combineDateAndTime,
  daysFromCalendarRange,
  defaultSponsoredAdStartTime,
  endDayFromStartAndDays,
  sponsoredAdScheduleSummary,
} from "@/lib/sponsored-ad/schedule";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

type SponsoredAdSchedulePickerProps = {
  startTime: Date;
  days: number;
  isOperator?: boolean;
  unlimitedSchedule?: boolean;
  onChange: (startTime: Date, days: number) => void;
  disabled?: boolean;
};

function isDayDisabled(day: Date, minTime: Date, allowPast: boolean): boolean {
  if (allowPast) return false;
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return dayEnd.getTime() < minTime.getTime();
}

function isHourDisabled(
  day: Date,
  hour: number,
  minTime: Date,
  allowPast: boolean
): boolean {
  if (allowPast) return false;
  const slot = new Date(day);
  slot.setHours(hour, 59, 59, 999);
  return slot.getTime() < minTime.getTime();
}

function isMinuteDisabled(
  day: Date,
  hour: number,
  minute: number,
  minTime: Date,
  allowPast: boolean
): boolean {
  if (allowPast) return false;
  const slot = new Date(day);
  slot.setHours(hour, minute, 0, 0);
  return slot.getTime() < minTime.getTime();
}

export function SponsoredAdSchedulePicker({
  startTime,
  days,
  isOperator = false,
  unlimitedSchedule = false,
  onChange,
  disabled,
}: SponsoredAdSchedulePickerProps) {
  const allowPast = isOperator && unlimitedSchedule;
  const maxDays = unlimitedSchedule
    ? SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS
    : SPONSORED_AD_MAX_DAYS;

  const [minTime, setMinTime] = useState(() => defaultSponsoredAdStartTime());
  const [rangeStart, setRangeStart] = useState(() => startOfDay(startTime));
  const [rangeEnd, setRangeEnd] = useState(() =>
    endDayFromStartAndDays(startOfDay(startTime), days)
  );
  const [hour, setHour] = useState(() => startTime.getHours());
  const [minute, setMinute] = useState(() => startTime.getMinutes());
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(startTime));
  const [dateTarget, setDateTarget] = useState<"start" | "end">("start");
  const lastEmitted = useRef<string>("");

  const summary = useMemo(
    () => sponsoredAdScheduleSummary(startTime, days),
    [startTime, days]
  );

  useEffect(() => {
    if (!allowPast) {
      const tick = window.setInterval(() => setMinTime(defaultSponsoredAdStartTime()), 30_000);
      return () => window.clearInterval(tick);
    }
  }, [allowPast]);

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

  const rangeInterval = useMemo(() => {
    const a = rangeStart.getTime() <= rangeEnd.getTime() ? rangeStart : rangeEnd;
    const b = rangeStart.getTime() <= rangeEnd.getTime() ? rangeEnd : rangeStart;
    return { start: a, end: b };
  }, [rangeStart, rangeEnd]);

  const availableHours = useMemo(
    () => HOURS.filter((h) => !isHourDisabled(rangeInterval.start, h, minTime, allowPast)),
    [rangeInterval.start, minTime, allowPast]
  );

  const availableMinutes = useMemo(
    () =>
      MINUTES.filter((m) => !isMinuteDisabled(rangeInterval.start, hour, m, minTime, allowPast)),
    [rangeInterval.start, hour, minTime, allowPast]
  );

  function emit(nextStartDay: Date, nextEndDay: Date, nextHour: number, nextMinute: number) {
    let start = combineDateAndTime(nextStartDay, nextHour, nextMinute);
    if (!allowPast && start.getTime() < minTime.getTime()) {
      start = new Date(minTime);
    }

    let nextDays = daysFromCalendarRange(nextStartDay, nextEndDay);
    nextDays = Math.min(nextDays, maxDays);

    const visualEnd = endDayFromStartAndDays(nextStartDay, nextDays);
    const key = `${start.toISOString()}|${nextDays}`;
    if (key === lastEmitted.current) return;
    lastEmitted.current = key;

    setRangeEnd(visualEnd);
    onChange(start, nextDays);
  }

  function onDayClick(day: Date) {
    if (isDayDisabled(day, minTime, allowPast)) return;
    const d = startOfDay(day);

    if (dateTarget === "start") {
      const end =
        rangeEnd.getTime() >= d.getTime() ? rangeEnd : endDayFromStartAndDays(d, 1);
      setRangeStart(d);
      setRangeEnd(end);
      emit(d, end, hour, minute);
      return;
    }

    let start = rangeStart;
    let end = d;
    if (end.getTime() < start.getTime()) {
      start = d;
      end = rangeStart;
    }
    setRangeStart(start);
    setRangeEnd(end);
    emit(start, end, hour, minute);
  }

  function onHourChange(nextHour: number) {
    setHour(nextHour);
    emit(rangeInterval.start, rangeInterval.end, nextHour, minute);
  }

  function onMinuteChange(nextMinute: number) {
    setMinute(nextMinute);
    emit(rangeInterval.start, rangeInterval.end, hour, nextMinute);
  }

  const today = startOfDay(new Date());
  const hourValue = availableHours.includes(hour) ? hour : (availableHours[0] ?? 0);
  const minuteValue = availableMinutes.includes(minute) ? minute : (availableMinutes[0] ?? 0);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">게재 기간</label>
        <p className="text-[11px] text-muted-foreground">
          시작일·종료일을 각각 선택 · 같은 시각 기준 24시간 단위
        </p>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setDateTarget("start")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
              dateTarget === "start"
                ? "bg-folk-terracotta text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            시작일 선택
          </button>
          <button
            type="button"
            onClick={() => setDateTarget("end")}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors",
              dateTarget === "end"
                ? "bg-folk-terracotta text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            종료일 선택
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-sm">
        <div className="grid sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="border-b sm:border-b-0 sm:border-r border-border/50 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                disabled={disabled}
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
                disabled={disabled}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-y-0.5 text-center text-[10px] text-muted-foreground mb-0.5">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const dayDisabled = isDayDisabled(day, minTime, allowPast);
                const dayStart = startOfDay(day);
                const inRange =
                  !dayDisabled &&
                  isWithinInterval(dayStart, {
                    start: rangeInterval.start,
                    end: rangeInterval.end,
                  });
                const isRangeStart = isSameDay(day, rangeInterval.start);
                const isRangeEnd = isSameDay(day, rangeInterval.end);
                const isToday = isSameDay(day, today);
                const dow = day.getDay();
                const solo = isRangeStart && isRangeEnd;
                const weekStart = inRange && dow === 0 && !isRangeStart;
                const weekEnd = inRange && dow === 6 && !isRangeEnd;

                return (
                  <div
                    key={day.toISOString()}
                    className="relative flex items-center justify-center py-0.5"
                  >
                    {inRange && !solo ? (
                      <span
                        className={cn(
                          "pointer-events-none absolute inset-y-1 bg-folk-terracotta/22",
                          isRangeStart && "left-1/2 right-0 rounded-l-full",
                          isRangeEnd && "left-0 right-1/2 rounded-r-full",
                          !isRangeStart && !isRangeEnd && "inset-x-0",
                          weekStart && "left-0 rounded-l-full",
                          weekEnd && "right-0 rounded-r-full"
                        )}
                        aria-hidden
                      />
                    ) : null}
                    <button
                      type="button"
                      disabled={dayDisabled || disabled}
                      onClick={() => onDayClick(day)}
                      className={cn(
                        "relative z-[1] flex h-9 w-9 items-center justify-center rounded-full text-sm transition-transform",
                        !inMonth && "text-muted-foreground/35",
                        dayDisabled && "opacity-30 cursor-not-allowed",
                        !inRange && !isToday && "hover:bg-muted/60",
                        isToday && !inRange && "ring-1 ring-folk-terracotta/50 text-folk-terracotta",
                        isRangeStart && dateTarget === "start" && "ring-2 ring-folk-terracotta ring-offset-2 ring-offset-card",
                        isRangeEnd && dateTarget === "end" && "ring-2 ring-folk-terracotta ring-offset-2 ring-offset-card",
                        inRange && (isRangeStart || isRangeEnd || solo)
                          ? "bg-folk-terracotta text-white font-semibold shadow-sm scale-105"
                          : inRange
                            ? "text-foreground font-medium"
                            : "text-foreground/80"
                      )}
                    >
                      {format(day, "d")}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              {format(rangeInterval.start, "M월 d일")} ~ {format(rangeInterval.end, "M월 d일")} ·{" "}
              {days}일
            </p>
          </div>

          <div
            className="flex items-center justify-center gap-5 px-3 py-4 bg-muted/15 isolate"
            style={{ touchAction: "manipulation" }}
          >
            <AppleWheelPicker
              items={availableHours.length > 0 ? availableHours : HOURS}
              value={hourValue}
              onChange={onHourChange}
              format={(h) => String(h).padStart(2, "0")}
              disabled={disabled}
              label="시"
            />
            <span className="text-lg font-light text-muted-foreground/50 pb-1">:</span>
            <AppleWheelPicker
              items={availableMinutes.length > 0 ? availableMinutes : MINUTES}
              value={minuteValue}
              onChange={onMinuteChange}
              format={(m) => String(m).padStart(2, "0")}
              disabled={disabled}
              label="분"
            />
          </div>
        </div>

        <div className="border-t border-border/50 px-4 py-3 space-y-1.5 bg-muted/10 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">시작</span>
            <span className="font-medium tabular-nums text-right">{summary.startLabel}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">종료</span>
            <span className="font-medium tabular-nums text-right">{summary.endLabel}</span>
          </div>
          <div className="flex justify-between gap-3 pt-1.5 border-t border-border/40">
            <span className="text-muted-foreground">
              {days}일 · {isOperator ? "운영자 면제" : "차감 MOCO"}
              {unlimitedSchedule ? " · 제한 없음" : ""}
            </span>
            <span className="font-bold text-folk-terracotta tabular-nums">
              {isOperator ? "0 MOCO" : `${summary.moco} MOCO`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
