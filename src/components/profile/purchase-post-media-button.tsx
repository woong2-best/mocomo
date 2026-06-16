"use client";

import { PayButton } from "@/components/payments/pay-button";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";

export function PurchasePostMediaButton({
  mediaId,
  priceKrw,
  label,
  paymentsEnabled,
  username,
  postId,
}: {
  mediaId?: string;
  priceKrw: number;
  label?: string;
  paymentsEnabled: boolean;
  username?: string;
  postId?: string;
}) {
  if (!mediaId) {
    return null;
  }
  if (!paymentsEnabled) {
    return (
      <p className="text-xs text-white/90 text-center px-2">
        결제 연동 후 구매할 수 있습니다.
      </p>
    );
  }

  const returnPath = usePathname();

  return (
    <PayButton
      type="POST_MEDIA"
      amount={priceKrw}
      orderName={label ?? "유료 미디어"}
      metadata={{ mediaId, username, postId, returnPath }}
      className="rounded-full h-9 px-4 text-xs gap-1.5 bg-white text-foreground hover:bg-white/90"
    >
      <Lock className="h-3.5 w-3.5" />
      {priceKrw.toLocaleString()}원 · 잠금 해제
    </PayButton>
  );
}
