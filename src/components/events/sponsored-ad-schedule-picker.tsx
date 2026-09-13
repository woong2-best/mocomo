"use client";

import { useEffect, useMemo, useState } from "react";
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
  combineDateAndTime,
  daysFromCalendarRange,
  defaultSponsoredAdStartTime,
  endDayFromStartAndDays,
  roundUpToNextFiveMinutes,
  sponsoredAdScheduleSummary,
} from "@/lib/sponsored-ad/schedule";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

type SponsoredAdSchedulePickerProps = {
  startTime: Date;
  days: number;
  maxDays: number;
  isOperator?: boolean;
  onChange: (startTime: Date, days: number) => void;
  disabled?: boolean;
};

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
  isOperator = false,
  onChange,
  disabled,
}: SponsoredAdSchedulePickerProps) {
  const [minTime, setMinTime] = useState(() => defaultSponsoredAdStartTime());
  const [rangeStart, setRangeStart] = useState(() => startOfDay(startTime));
  const [rangeEnd, setRangeEnd] = useState(() => endDayFromStartAndDays(startOfDay(startTime), days));
  const [hour, setHour] = useState(() => startTime.getHours());
  const [minute, setMinute] = useState(() => startTime.getMinutes() - (startTime.getMinutes() % 5));
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(startTime));
  const [pickingEnd, setPickingEnd] = useState(false);

  const summary = useMemo(
    () => sponsoredAdScheduleSummary(startTime, days),
    [startTime, days]
  );

  useEffect(() => {
    const tick = window.setInterval(() => setMinTime(defaultSponsoredAdStartTime()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    setRangeStart(startOfDay(startTime));
    setRangeEnd(endDayFromStartAndDays(startOfDay(startTime), days));
    setHour(startTime.getHours());
    setMinute(startTime.getMinutes() - (startTime.getMinutes() % 5));
  }, [startTime, days]);

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
    () => HOURS.filter((h) => !isHourDisabled(rangeStart, h, minTime)),
    [rangeStart, minTime]
  );

  const availableMinutes = useMemo(
    () => MINUTES.filter((m) => !isMinuteDisabled(rangeStart, hour, m, minTime)),
    [rangeStart, hour, minTime]
  );

  useEffect(() => {
    if (!availableHours.includes(hour) && availableHours.length > 0) {
      setHour(availableHours[0]);
    }
  }, [availableHours, hour]);

  useEffect(() => {
    if (!availableMinutes.includes(minute) && availableMinutes.length > 0) {
      setMinute(availableMinutes[0]);
    }
  }, [availableMinutes, minute]);

  function emit(nextStartDay: Date, nextEndDay: Date, nextHour: number, nextMinute: number) {
    let start = combineDateAndTime(nextStartDay, nextHour, nextMinute);
    start = roundUpToNextFiveMinutes(start);
    if (start.getTime() < minTime.getTime()) {
      start = roundUpToNextFiveMinutes(minTime);
    }
    let nextDays = daysFromCalendarRange(nextStartDay, nextEndDay);
    nextDays = Math.min(nextDays, maxDays);
    const adjustedEnd = endDayFromStartAndDays(nextStartDay, nextDays);
    onChange(start, nextDays);
    setRangeEnd(adjustedEnd);
  }

  function onDayClick(day: Date) {
    if (isDayDisabled(day, minTime)) return;
    const d = startOfDay(day);

    if (!pickingEnd || isSameDay(d, rangeStart)) {
      setRangeStart(d);
      setRangeEnd(d);
      setPickingEnd(true);
      emit(d, d, hour, minute);
      return;
    }

    let start = rangeStart;
    let end = d;
    if (end.getTime() < start.getTime()) {
      [start, end] = [end, start];
    }

    const span = daysFromCalendarRange(start, end);
    if (span > maxDays) {
      end = endDayFromStartAndDays(start, maxDays);
    }

    setRangeStart(start);
    setRangeEnd(end);
    setPickingEnd(false);
    emit(start, end, hour, minute);
  }

  function onHourChange(nextHour: number) {
    setHour(nextHour);
    emit(rangeStart, rangeEnd, nextHour, minute);
  }

  function onMinuteChange(nextMinute: number) {
    setMinute(nextMinute);
    emit(rangeStart, rangeEnd, hour, nextMinute);
  }

  const rangeInterval = useMemo(() => {
    const a = rangeStart.getTime() <= rangeEnd.getTime() ? rangeStart : rangeEnd;
    const b = rangeStart.getTime() <= rangeEnd.getTime() ? rangeEnd : rangeStart;
    return { start: a, end: b };
  }, [rangeStart, rangeEnd]);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">게재 기간</label>
        <p className="text-[11px] text-muted-foreground">
          달력에서 시작일과 종료일을 선택하세요. 같은 시각 기준 24시간 단위로 계산됩니다.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/15">
        <div className="grid sm:grid-cols-[minmax(0,1fr)_148px]">
          <div className="border-b sm:border-b-0 sm:border-r border-border/60 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
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

            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground mb-1">
              {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day) => {
                const inMonth = isSameMonth(day, viewMonth);
                const dayDisabled = isDayDisabled(day, minTime);
                const inRange =
                  !dayDisabled &&
                  isWithinInterval(startOfDay(day), {
                    start: rangeInterval.start,
                    end: rangeInterval.end,
                  });
                const isStart = isSameDay(day, rangeInterval.start);
                const isEnd = isSameDay(day, rangeInterval.end);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={dayDisabled || disabled}
                    onClick={() => onDayClick(day)}
                    className={cn(
                      "relative aspect-square text-xs transition-colors",
                      !inMonth && "text-muted-foreground/35",
                      dayDisabled && "opacity-30 cursor-not-allowed",
                      inRange && "bg-primary/15",
                      isStart && "rounded-l-full",
                      isEnd && "rounded-r-full",
                      isStart && isEnd && "rounded-full",
                      (isStart || isEnd) && "bg-primary text-primary-foreground font-semibold z-[1]"
                    )}
                  >
                    <span className="relative z-[2]">{format(day, "d")}</span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-[10px] text-muted-foreground text-center">
              {pickingEnd ? "종료일을 선택하세요" : `${format(rangeInterval.start, "M월 d일")} ~ ${format(rangeInterval.end, "M월 d일")}`}
            </p>
          </div>

          <div className="flex bg-muted/10 min-h-[200px]">
            <AppleWheelPicker
              items={availableHours.length > 0 ? availableHours : HOURS}
              value={availableHours.includes(hour) ? hour : (availableHours[0] ?? 0)}
              onChange={onHourChange}
              format={(h) => String(h).padStart(2, "0")}
              disabled={disabled}
            />
            <AppleWheelPicker
              items={availableMinutes.length > 0 ? availableMinutes : MINUTES}
              value={
                availableMinutes.includes(minute) ? minute : (availableMinutes[0] ?? 0)
              }
              onChange={onMinuteChange}
              format={(m) => String(m).padStart(2, "0")}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="border-t border-border/60 px-4 py-3 space-y-2 bg-muted/10">
          <div className="flex items-center justify-between text-sm gap-3">
            <span className="text-muted-foreground shrink-0">시작</span>
            <span className="font-medium tabular-nums text-right">{summary.startLabel}</span>
          </div>
          <div className="flex items-center justify-between text-sm gap-3">
            <span className="text-muted-foreground shrink-0">종료</span>
            <span className="font-medium tabular-nums text-right">{summary.endLabel}</span>
          </div>
          <div className="flex items-center justify-between text-sm pt-1 border-t border-border/40 gap-3">
            <span className="text-muted-foreground shrink-0">
              {days}일 · {isOperator ? "운영자 면제" : "차감 MOCO"}
            </span>
            <span className="font-bold text-primary tabular-nums">
              {isOperator ? "0 MOCO" : `${summary.moco} MOCO`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
