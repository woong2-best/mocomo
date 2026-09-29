"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmUsedAuctionTrade } from "@/actions/used-market";
import { Button } from "@/components/ui/button";

export function UsedAuctionTradeComplete({
  listingId,
  isSeller,
  isWinningBidder,
  sellerConfirmed,
  buyerConfirmed,
  hasMeetPin,
  sold,
}: {
  listingId: string;
  isSeller: boolean;
  isWinningBidder: boolean;
  sellerConfirmed: boolean;
  buyerConfirmed: boolean;
  hasMeetPin: boolean;
  sold: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mineConfirmed = isSeller ? sellerConfirmed : isWinningBidder ? buyerConfirmed : false;

  if (sold || (!isSeller && !isWinningBidder)) return null;

  if (hasMeetPin) {
    return (
      <section className="rounded-xl border border-border/70 bg-muted/20 p-3">
        <p className="text-sm font-semibold leading-5 text-foreground">
          약속 시간에 거래 메시지에서 현장 도착 인증을 눌러 주세요. 양쪽이 인증되면 암호코드로 거래를
          끝냅니다.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="text-sm font-semibold leading-5 text-foreground">
        거래가 끝나면 판매자와 낙찰자가 각각 거래 완료를 눌러 주세요. 둘 다 누르면 보증금 2 MOCO가 각각
        돌아옵니다.
      </p>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button
        type="button"
        className="h-11 w-full rounded-[10px] bg-folk-terracotta font-bold text-white hover:bg-folk-terracotta/90"
        disabled={busy || mineConfirmed}
        onClick={async () => {
          setError("");
          setBusy(true);
          const res = await confirmUsedAuctionTrade(listingId);
          setBusy(false);
          if ("error" in res && res.error) {
            setError(res.error);
            return;
          }
          router.refresh();
        }}
      >
        {mineConfirmed ? "상대방 확인 대기" : busy ? "처리 중…" : "거래 완료"}
      </Button>
    </section>
  );
}
