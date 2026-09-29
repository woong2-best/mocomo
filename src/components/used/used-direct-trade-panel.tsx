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

function formatWhen(iso: string | null) {
  if (!iso) return "아직 없음";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "아직 없음";
  return date.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
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
      setNote("요청에 실패했습니다.");
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
        판매자 @{view.sellerUsername} · {view.priceLabel}
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">상대</dt>
        <dd>@{view.counterpartUsername}</dd>
        <dt className="text-muted-foreground">거래 상태</dt>
        <dd>{view.tradeStatusLabel}</dd>
        <dt className="text-muted-foreground">약속 시간</dt>
        <dd>{formatWhen(view.meetAt)}</dd>
        <dt className="text-muted-foreground">보증금</dt>
        <dd>{view.depositStatusLabel}</dd>
        <dt className="text-muted-foreground">분쟁</dt>
        <dd>{view.disputeStatusLabel}</dd>
        <dt className="text-muted-foreground">내 도착</dt>
        <dd>{view.myArrivalLabel}</dd>
        <dt className="text-muted-foreground">상대 도착</dt>
        <dd>{view.counterpartArrivalLabel}</dd>
        <dt className="text-muted-foreground">패널티</dt>
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
            약속 제안
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
          거래 수락
        </button>
      ) : null}
      {view.canAdjustMeet ? (
        <div className="flex gap-2">
          <button type="button" disabled={busy} className="h-9 rounded-lg border px-3 text-xs font-semibold" onClick={() => void run(() => adjustDirectMeetAction(view.listingId, "earlier"))}>
            15분 앞당기기
          </button>
          <button type="button" disabled={busy} className="h-9 rounded-lg border px-3 text-xs font-semibold" onClick={() => void run(() => adjustDirectMeetAction(view.listingId, "later"))}>
            15분 늦추기
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
          {view.myArrivalStatus === "ARRIVAL_PENDING" ? "현장 도착 인증" : "다시 인증"}
        </button>
      ) : null}
      {view.canReportNoShow ? (
        <button
          type="button"
          disabled={busy}
          className="h-9 rounded-lg bg-destructive px-3 text-xs font-semibold text-destructive-foreground disabled:opacity-50"
          onClick={() => void run(() => reportDirectNoShowAction(view.listingId))}
        >
          상대방 노쇼 신고
        </button>
      ) : null}
      {view.canSubmitPin ? (
        <div className="flex gap-2">
          <input
            inputMode="numeric"
            maxLength={6}
            value={pin}
            placeholder="암호코드 6자리"
            onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            className="h-9 w-32 rounded-lg border bg-background px-2 tracking-widest"
          />
          <button
            type="button"
            disabled={busy || pin.length !== 6}
            className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            onClick={() => void run(() => submitDirectTradePinAction(view.listingId, pin))}
          >
            거래 완료
          </button>
        </div>
      ) : null}
    </div>
  );
}
