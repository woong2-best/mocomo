"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export function ChatUsedTradeMeetCompletionCard({
  requestId,
  isBuyer,
  buyerMeetConfirmedAt,
  sellerMeetConfirmedAt,
  onUpdated,
}: {
  requestId: string;
  isBuyer: boolean;
  buyerMeetConfirmedAt: string | null;
  sellerMeetConfirmedAt: string | null;
  onUpdated?: () => void;
}) {
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const selfConfirmed = isBuyer ? buyerMeetConfirmedAt : sellerMeetConfirmedAt;
  const peerConfirmed = isBuyer ? sellerMeetConfirmedAt : buyerMeetConfirmedAt;

  async function respond(action: "confirm" | "decline") {
    if (busy || selfConfirmed) return;
    setBusy(true);
    try {
      await fetch(`/api/used/trade-requests/${encodeURIComponent(requestId)}/meet-completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-1 mb-2 max-w-[280px] rounded-2xl border border-border/70 bg-[#0f1524] p-3 text-white">
      <p className="text-sm font-extrabold">{t("ui.was_the_trade_completed")}</p>
      {selfConfirmed ? (
        <p className="mt-2 text-xs font-semibold text-white/70">
          {peerConfirmed
            ? t("ui.trade_marked_complete")
            : t("ui.you_confirmed_waiting_for_the_other")}
        </p>
      ) : (
        <div className="mt-3 flex justify-center gap-4">
          <button
            type="button"
            disabled={busy}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 disabled:opacity-50"
            onClick={() => void respond("decline")}
            aria-label={t("ui.not_completed")}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={busy}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 disabled:opacity-50"
            onClick={() => void respond("confirm")}
            aria-label={t("ui.completed")}
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
