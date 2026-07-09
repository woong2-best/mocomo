"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markAuctionPaymentComplete } from "@/actions/used-auction-payment";
import { Button } from "@/components/ui/button";
import { UsedAuctionPaymentCountdown } from "@/components/used/used-auction-payment-countdown";
import { formatUsedPrice } from "@/lib/used-market";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function UsedAuctionPaymentPanel({
  listingId,
  paymentDueAt,
  amount,
  isWinner,
  paymentCompleted,
}: {
  listingId: string;
  paymentDueAt: Date | string;
  amount: number;
  isWinner: boolean;
  paymentCompleted?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (paymentCompleted) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex gap-2 items-start">
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-green-700 dark:text-green-400">결제 완료 신고됨</p>
          <p className="text-xs text-muted-foreground">판매자와 채팅으로 거래를 마무리하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-orange-500/40 bg-orange-500/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-orange-700 dark:text-orange-300">낙찰 · 결제 필요</p>
          <p className="text-lg font-black">{formatUsedPrice(amount)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">남은 결제 시간</p>
          <UsedAuctionPaymentCountdown dueAt={paymentDueAt} className="text-base" />
        </div>
      </div>

      <div className="flex gap-2 items-start text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
        <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
        <p>
          낙찰 후 결제를 완료하지 않을 경우 <strong className="text-foreground">중고거래 이용이 영구 제한</strong>
          됩니다. 판매자와 채팅으로 결제·수령을 조율한 뒤 아래 버튼으로 완료를 신고하세요.
        </p>
      </div>

      {isWinner && (
        <>
          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              const res = await markAuctionPaymentComplete(listingId);
              setBusy(false);
              if ("error" in res && res.error) setError(res.error);
              else router.refresh();
            }}
          >
            {busy ? "처리 중…" : "결제 완료 신고"}
          </Button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}
    </section>
  );
}
