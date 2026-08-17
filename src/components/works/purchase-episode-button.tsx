"use client";

import { PayButton } from "@/components/payments/pay-button";
import { formatUsd } from "@/lib/money";

export function PurchaseEpisodeButton({
  episodeId,
  price,
  title,
  paymentsEnabled,
}: {
  episodeId: string;
  price: number;
  title: string;
  paymentsEnabled: boolean;
}) {
  if (!paymentsEnabled) {
    return (
      <p className="text-sm text-center text-muted-foreground py-2">
        결제 연동 후 구매할 수 있습니다.
      </p>
    );
  }

  return (
    <PayButton
      type="CREATOR_EPISODE"
      amount={price}
      orderName={title}
      metadata={{ episodeId }}
      className="w-full rounded-xl"
    >
      {formatUsd(price)} 구매 · 전체 보기
    </PayButton>
  );
}
