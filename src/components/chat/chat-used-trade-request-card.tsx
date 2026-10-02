"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, ShoppingBag, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
type TradeRequest = {
  id: string;
  listingId: string;
  listingTitle: string;
  meetAt?: string | null;
  status: string;
  canRespond?: boolean;
  requestedById?: string | null;
  buyerId: string;
};

export function ChatUsedTradeRequestCard({
  requestId,
  selfUserId,
  onUpdated,
}: {
  requestId: string;
  selfUserId: string;
  onUpdated?: () => void;
}) {
  const { locale , t } = useLocale();
  const [request, setRequest] = useState<TradeRequest | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/used/trade-requests/${encodeURIComponent(requestId)}`);
      const body = (await res.json()) as { request?: TradeRequest };
      if (res.ok && body.request) setRequest(body.request);
    } catch {
      setRequest(null);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function respond(action: "approve" | "reject") {
    if (!request || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/used/trade-requests/${encodeURIComponent(requestId)}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) return;
      await load();
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  if (!request) return null;

  const sentByMe = request.requestedById
    ? request.requestedById === selfUserId
    : request.buyerId === selfUserId;
  const statusLabel =
    request.status === "PENDING"
      ? t("ui.pending")
      : request.status === "APPROVED"
        ? t("ui.reserved")
        : request.status === "REJECTED"
          ? t("ui.declined")
          : t("ui.cancelled");

  const href = `/market/${request.listingId}`;

  return (
    <Link
      href={href}
      className="block w-[248px] max-w-full overflow-hidden rounded-2xl border border-border/70 bg-[#0f1524] text-white shadow-sm"
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <ShoppingBag className="h-5 w-5 text-sky-400 shrink-0" />
        <p className="text-sm font-extrabold">{t("ui.used_trade_request")}</p>
      </div>
      <p className="px-3 pt-2 text-[13px] font-semibold text-white/90">
        {sentByMe
          ? t("ui.you_sent_a_trade_schedule")
          : t("ui.a_trade_schedule_arrived")}
      </p>
      {request.meetAt ? (
        <p className="px-3 text-xs font-semibold text-white/60">{formatMeetAt(request.meetAt, locale)}</p>
      ) : null}
      <p className="px-3 pb-2 text-xs font-bold text-sky-300">{statusLabel}</p>
      {request.status === "PENDING" && request.canRespond ? (
        <div className="flex justify-center gap-4 px-3 pb-3" onClick={(e) => e.preventDefault()}>
          <button
            type="button"
            disabled={busy}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white disabled:opacity-50"
            onClick={() => void respond("reject")}
            aria-label={t("collab.reject")}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={busy}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-white disabled:opacity-50"
            onClick={() => void respond("approve")}
            aria-label={t("ui.approve")}
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </Link>
  );
}

function formatMeetAt(iso: string, locale: string | undefined) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const daysKo = ["일", "월", "화", "수", "목", "금", "토"];
  const daysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = daysEn;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]}) ${hh}:${mm}`;
}
