"use client";


import { errorText } from "@/lib/i18n/error-text";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { ChatUsedTradeMeetCompletionCard } from "@/components/chat/chat-used-trade-meet-completion-card";
import { useLocale } from "@/components/providers/locale-provider";
import { parseMeetTimeInput } from "@/lib/used-trade-meet";
import { cn } from "@/lib/utils";

type UsedTradeContext = {
  listingId: string;
  isBuyer: boolean;
  canRequestTrade: boolean;
  approvedMeet?: {
    requestId: string;
    showCompletionPrompt: boolean;
    buyerMeetConfirmedAt: string | null;
    sellerMeetConfirmedAt: string | null;
  } | null;
};

const MEET_DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6];

function meetDayLabel(offset: number, locale: string | undefined) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  if (offset === 0) return t("calendar.today");
  if (offset === 1) return t("ui.tomorrow");
  const daysKo = ["일", "월", "화", "수", "목", "금", "토"];
  const daysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = locale === "ko" ? daysKo[date.getDay()] : daysEn[date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()} (${dayName})`;
}

export function ChatUsedTradePanel({
  roomId,
  readOnly,
}: {
  roomId: string;
  readOnly?: boolean;
}) {
  const { locale } = useLocale();
  const [ctx, setCtx] = useState<UsedTradeContext | null>(null);
  const [meetDayOffset, setMeetDayOffset] = useState(1);
  const [meetCustomDate, setMeetCustomDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [meetTimeText, setMeetTimeText] = useState("15:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/used/trade-room/${encodeURIComponent(roomId)}`);
      const body = (await res.json()) as { usedTrade?: UsedTradeContext | null };
      setCtx(body.usedTrade ?? null);
    } catch {
      setCtx(null);
    }
  }, [roomId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  async function requestTrade() {
    if (!ctx?.canRequestTrade || busy) return;
    setError("");
    const parsedTime = parseMeetTimeInput(meetTimeText);
    if (!parsedTime) {
      setError(t("ui.enter_trade_time_as_hh_mm"));
      return;
    }
    const meetAt = meetCustomDate ? new Date(meetCustomDate) : new Date();
    if (!meetCustomDate) meetAt.setDate(meetAt.getDate() + meetDayOffset);
    meetAt.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    if (meetAt.getTime() < Date.now()) {
      setError(t("ui.pick_a_time_later_than_now"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/used/listings/${encodeURIComponent(ctx.listingId)}/trade-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, meetAt: meetAt.toISOString() }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(errorText(body.error ?? t("ui.could_not_send_trade_request")));
        return;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!ctx) return null;

  return (
    <div className="shrink-0 border-t border-border/60 bg-background px-3 py-2 space-y-2">
      {ctx.approvedMeet?.showCompletionPrompt ? (
        <ChatUsedTradeMeetCompletionCard
          requestId={ctx.approvedMeet.requestId}
          isBuyer={ctx.isBuyer}
          buyerMeetConfirmedAt={ctx.approvedMeet.buyerMeetConfirmedAt}
          sellerMeetConfirmedAt={ctx.approvedMeet.sellerMeetConfirmedAt}
          onUpdated={() => void refresh()}
        />
      ) : null}

      {!readOnly && ctx.canRequestTrade ? (
        <>
          <p className="text-xs font-bold text-muted-foreground">{t("ui.trade_date")}</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {MEET_DAY_OFFSETS.map((offset) => {
              const isCalendarSlot = offset === 6;
              const selected = isCalendarSlot
                ? meetCustomDate != null
                : meetCustomDate == null && meetDayOffset === offset;
              const label = isCalendarSlot
                ? meetCustomDate
                  ? `${meetCustomDate.getMonth() + 1}/${meetCustomDate.getDate()}`
                  : t("ui.pick_date")
                : meetDayLabel(offset, locale);
              return (
                <button
                  key={offset}
                  type="button"
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold",
                    selected ? "border-folk-cobalt bg-folk-cobalt text-white" : "border-border bg-muted/40"
                  )}
                  onClick={() => {
                    if (isCalendarSlot) setCalendarOpen(true);
                    else {
                      setMeetCustomDate(null);
                      setMeetDayOffset(offset);
                    }
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs font-bold text-muted-foreground">{t("ui.trade_time")}</p>
          <input
            value={meetTimeText}
            onChange={(e) => setMeetTimeText(e.target.value)}
            placeholder="15:00"
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void requestTrade()}
            className="h-11 w-full rounded-xl bg-folk-cobalt text-sm font-extrabold text-white disabled:opacity-50"
          >
            {t("ui.request_trade_meetup")}
          </button>
        </>
      ) : null}

      {calendarOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center">
          <div className="max-h-[70vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-background sm:rounded-2xl border border-border">
            <p className="px-4 py-3 text-base font-extrabold">{t("ui.pick_trade_date")}</p>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {calendarDays.map((d) => (
                <button
                  key={d.toISOString()}
                  type="button"
                  className="block w-full px-4 py-3 text-left text-sm font-semibold hover:bg-muted/60"
                  onClick={() => {
                    setMeetCustomDate(d);
                    setCalendarOpen(false);
                  }}
                >
                  {meetDayLabel(
                    Math.round((d.getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000),
                    locale
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="w-full border-t py-3 text-sm font-bold text-muted-foreground"
              onClick={() => setCalendarOpen(false)}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
