"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

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
      <p className="text-sm font-extrabold">{uiText(locale, "거래가 완료되었나요?", "Was the trade completed?")}</p>
      {selfConfirmed ? (
        <p className="mt-2 text-xs font-semibold text-white/70">
          {peerConfirmed
            ? uiText(locale, "거래가 완료되었습니다.", "Trade marked complete.")
            : uiText(locale, "완료로 응답했습니다. 상대 확인을 기다려 주세요.", "You confirmed. Waiting for the other party.")}
        </p>
      ) : (
        <div className="mt-3 flex justify-center gap-4">
          <button
            type="button"
            disabled={busy}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 disabled:opacity-50"
            onClick={() => void respond("decline")}
            aria-label={uiText(locale, "미완료", "Not completed")}
          >
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={busy}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 disabled:opacity-50"
            onClick={() => void respond("confirm")}
            aria-label={uiText(locale, "완료", "Completed")}
          >
            <Check className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
