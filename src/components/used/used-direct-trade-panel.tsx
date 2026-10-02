"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptDirectMeetAction,
  adjustDirectMeetAction,
  proposeDirectMeetAction,
  reportDirectNoShowAction,
  submitDirectTradePinAction,
  verifyDirectArrivalAction,
} from "@/actions/direct-trade";
import type { DirectTradeView } from "@/lib/direct-trade/types";
import { useLocale } from "@/components/providers/locale-provider";

function formatWhen(iso: string | null, locale: string | undefined) {
  const none = t("ui.not_set");
  if (!iso) return none;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return none;
  const tag = locale === "ko" ? "ko-KR" : "en-US";
  return date.toLocaleString(tag, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function readArrivalFix(): Promise<
  | { latitude: number; longitude: number; accuracyMeters: number | null }
  | { failure: "PERMISSION_DENIED" | "GPS_FAILED" }
> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { failure: "GPS_FAILED" };
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        }),
      (err) => resolve({ failure: err.code === 1 ? "PERMISSION_DENIED" : "GPS_FAILED" }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  });
}

export function UsedDirectTradePanel({ initial }: { initial: DirectTradeView }) {
  const router = useRouter();
  const { locale } = useLocale();
  const [view, setView] = useState(initial);
  useEffect(() => {
    setView(initial);
  }, [initial]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [meetLocal, setMeetLocal] = useState("");
  const [pin, setPin] = useState("");

  async function run(task: () => Promise<{ view: DirectTradeView; error?: string }>) {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const result = await task();
      if (result.view?.listingId) setView(result.view);
      if (result.error) setNote(result.error);
      router.refresh();
    } catch {
      setNote(t("ui.request_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const fix = await readArrivalFix();
    await run(() => verifyDirectArrivalAction(view.listingId, fix));
  }

  return (
    <div className="shrink-0 border-b border-border/60 bg-muted/20 p-3 space-y-2 text-sm">
      <p className="font-semibold truncate">{view.listingTitle}</p>
      <p className="text-xs text-muted-foreground">
        {t("ui.seller")} @{view.sellerUsername} · {view.priceLabel}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">{t("ui.counterparty")}</dt>
        <dd>@{view.counterpartUsername}</dd>
        <dt className="text-muted-foreground">{t("ui.trade_status")}</dt>
        <dd>{view.tradeStatusLabel}</dd>
        <dt className="text-muted-foreground">{t("ui.meet_time")}</dt>
        <dd>{formatWhen(view.meetAt, locale)}</dd>
        <dt className="text-muted-foreground">{t("ui.deposit")}</dt>
        <dd>{view.depositStatusLabel}</dd>
        <dt className="text-muted-foreground">{t("ui.dispute")}</dt>
        <dd>{view.disputeStatusLabel}</dd>
        <dt className="text-muted-foreground">{t("ui.my_arrival")}</dt>
        <dd>{view.myArrivalLabel}</dd>
        <dt className="text-muted-foreground">{t("ui.their_arrival")}</dt>
        <dd>{view.counterpartArrivalLabel}</dd>
        <dt className="text-muted-foreground">{t("ui.penalty")}</dt>
        <dd>{view.penaltyStatusLabel}</dd>
      </dl>
      {view.guidance ? <p className="text-xs leading-5">{view.guidance}</p> : null}
      {view.myPin ? (
        <div className="space-y-1">
          <p className="text-2xl font-extrabold tracking-[0.25em]">{view.myPin}</p>
          {view.pinWarning ? <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">{view.pinWarning}</p> : null}
        </div>
      ) : null}
      {note ? <p className="text-xs text-destructive">{note}</p> : null}
      {view.canProposeMeet ? (
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="datetime-local"
            value={meetLocal}
            onChange={(event) => setMeetLocal(event.target.value)}
            className="h-9 rounded-lg border bg-background px-2 text-xs"
          />
          <button
            type="button"
            disabled={busy || !meetLocal}
            className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            onClick={() => {
              const date = new Date(meetLocal);
              if (Number.isNaN(date.getTime())) return;
              void run(() => proposeDirectMeetAction(view.listingId, date.toISOString()));
            }}
          >
            {t("ui.propose_meetup")}
          </button>
        </div>
      ) : null}
      {view.canAcceptMeet ? (
        <button
          type="button"
          disabled={busy}
          className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          onClick={() => void run(() => acceptDirectMeetAction(view.listingId))}
        >
          {t("ui.accept_trade")}
        </button>
      ) : null}
      {view.canAdjustMeet ? (
        <div className="flex gap-2">
          <button type="button" disabled={busy} className="h-9 rounded-lg border px-3 text-xs font-semibold" onClick={() => void run(() => adjustDirectMeetAction(view.listingId, "earlier"))}>
            {t("ui.15_min_earlier")}
          </button>
          <button type="button" disabled={busy} className="h-9 rounded-lg border px-3 text-xs font-semibold" onClick={() => void run(() => adjustDirectMeetAction(view.listingId, "later"))}>
            {t("ui.15_min_later")}
          </button>
        </div>
      ) : null}
      {view.canVerifyArrival ? (
        <button
          type="button"
          disabled={busy}
          className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          onClick={() => void verify()}
        >
          {view.myArrivalStatus === "ARRIVAL_PENDING"
            ? t("ui.verify_arrival")
            : t("ui.verify_again")}
        </button>
      ) : null}
      {view.canReportNoShow ? (
        <button
          type="button"
          disabled={busy}
          className="h-9 rounded-lg bg-destructive px-3 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
          onClick={() => void run(() => reportDirectNoShowAction(view.listingId))}
        >
          {t("ui.report_no_show")}
        </button>
      ) : null}
      {view.canSubmitPin ? (
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            maxLength={6}
            value={pin}
            placeholder={t("auth.codePlaceholder")}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-9 w-32 rounded-lg border bg-background px-2 tracking-widest"
          />
          <button
            type="button"
            disabled={busy || pin.length !== 6}
            className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            onClick={() => void run(() => submitDirectTradePinAction(view.listingId, pin))}
          >
            {t("ui.complete_trade")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
