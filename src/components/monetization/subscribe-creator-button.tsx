"use client";

import { PayButton } from "@/components/payments/pay-button";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";

export function SubscribeCreatorButton({
  creatorId,
  username,
  priceKrw,
  paymentsEnabled,
  subscribed = false,
  compact = false,
}: {
  creatorId: string;
  username: string;
  priceKrw: number;
  paymentsEnabled: boolean;
  subscribed?: boolean;
  compact?: boolean;
}) {
  const returnPath = usePathname();

  if (subscribed) {
    return (
      <Button
        variant="outline"
        className={compact ? "rounded-full font-bold px-4 h-9 text-sm" : "rounded-full font-bold px-5"}
        disabled
      >
        구독 중
      </Button>
    );
  }

  if (!paymentsEnabled) {
    return (
      <Button
        variant="outline"
        className={compact ? "rounded-full font-bold px-4 h-9 text-sm" : "rounded-full font-bold px-5"}
        disabled
        title="Stripe 연동 후 구독 가능"
      >
        월 {formatUsd(priceKrw)} 구독
      </Button>
    );
  }

  return (
    <PayButton
      type="CREATOR_SUBSCRIPTION"
      amount={priceKrw}
      orderName={`@${username} 월 구독`}
      metadata={{ creatorId, username, returnPath }}
      className={
        compact
          ? "rounded-full font-bold px-4 h-9 text-sm gap-1.5 bg-violet-600 hover:bg-violet-600/90 text-white"
          : "rounded-full font-bold px-5 gap-1.5 bg-violet-600 hover:bg-violet-600/90 text-white"
      }
    >
      <Heart className="h-4 w-4" />
        월 {formatUsd(priceKrw)} 구독
    </PayButton>
  );
}

export function SubscribeCreatorHint({ priceKrw }: { priceKrw: number }) {
  return (
    <p className="text-[10px] text-white/80 text-center px-2">
      {formatUsd(priceKrw)} · 매월 자동결제
    </p>
  );
}
