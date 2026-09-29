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
import { uiText } from "@/lib/i18n/ui-text";

function formatWhen(iso: string | null, locale: string | undefined) {
  const none = uiText(locale, "아직 없음", "Not set");
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
      setNote(uiText(locale, "요청에 실패했습니다.", "Request failed."));
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
        {uiText(locale, "판매자", "Seller")} @{view.sellerUsername} · {view.priceLabel}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">{uiText(locale, "상대", "Counterparty")}</dt>
        <dd>@{view.counterpartUsername}</dd>
        <dt className="text-muted-foreground">{uiText(locale, "거래 상태", "Trade status")}</dt>
        <dd>{view.tradeStatusLabel}</dd>
        <dt className="text-muted-foreground">{uiText(locale, "약속 시간", "Meet time")}</dt>
        <dd>{formatWhen(view.meetAt, locale)}</dd>
        <dt className="text-muted-foreground">{uiText(locale, "보증금", "Deposit")}</dt>
        <dd>{view.depositStatusLabel}</dd>
        <dt className="text-muted-foreground">{uiText(locale, "분쟁", "Dispute")}</dt>
        <dd>{view.disputeStatusLabel}</dd>
        <dt className="text-muted-foreground">{uiText(locale, "내 도착", "My arrival")}</dt>
        <dd>{view.myArrivalLabel}</dd>
        <dt className="text-muted-foreground">{uiText(locale, "상대 도착", "Their arrival")}</dt>
        <dd>{view.counterpartArrivalLabel}</dd>
        <dt className="text-muted-foreground">{uiText(locale, "패널티", "Penalty")}</dt>
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
            {uiText(locale, "약속 제안", "Propose meetup")}
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
          {uiText(locale, "거래 수락", "Accept trade")}
        </button>
      ) : null}
      {view.canAdjustMeet ? (
        <div className="flex gap-2">
          <button type="button" disabled={busy} className="h-9 rounded-lg border px-3 text-xs font-semibold" onClick={() => void run(() => adjustDirectMeetAction(view.listingId, "earlier"))}>
            {uiText(locale, "15분 앞당기기", "15 min earlier")}
          </button>
          <button type="button" disabled={busy} className="h-9 rounded-lg border px-3 text-xs font-semibold" onClick={() => void run(() => adjustDirectMeetAction(view.listingId, "later"))}>
            {uiText(locale, "15분 늦추기", "15 min later")}
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
            ? uiText(locale, "현장 도착 인증", "Verify arrival")
            : uiText(locale, "다시 인증", "Verify again")}
        </button>
      ) : null}
      {view.canReportNoShow ? (
        <button
          type="button"
          disabled={busy}
          className="h-9 rounded-lg bg-destructive px-3 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
          onClick={() => void run(() => reportDirectNoShowAction(view.listingId))}
        >
          {uiText(locale, "상대방 노쇼 신고", "Report no-show")}
        </button>
      ) : null}
      {view.canSubmitPin ? (
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            maxLength={6}
            value={pin}
            placeholder={uiText(locale, "암호코드 6자리", "6-digit code")}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-9 w-32 rounded-lg border bg-background px-2 tracking-widest"
          />
          <button
            type="button"
            disabled={busy || pin.length !== 6}
            className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            onClick={() => void run(() => submitDirectTradePinAction(view.listingId, pin))}
          >
            {uiText(locale, "거래 완료", "Complete trade")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
