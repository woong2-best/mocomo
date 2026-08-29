"use client";

import { PayButton } from "@/components/payments/pay-button";
import { formatUsd } from "@/lib/money";
import { usePathname } from "next/navigation";

export function PurchaseMessageMediaButton({
  attachmentId,
  priceKrw,
  label = "결제하기",
  paymentsEnabled = true,
  sellerUsername,
  returnPath,
  onPurchaseSuccess,
}: {
  attachmentId: string;
  priceKrw: number;
  label?: string;
  paymentsEnabled?: boolean;
  sellerUsername?: string;
  returnPath?: string;
  onPurchaseSuccess?: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const checkoutReturn = returnPath ?? pathname;

  if (!paymentsEnabled) {
    return (
      <p className="text-[13px] font-semibold text-white/90 text-center px-2">
        결제 연동 후 구매할 수 있습니다.
      </p>
    );
  }

  return (
    <PayButton
      type="MESSAGE_MEDIA"
      amount={priceKrw}
      orderName="팬아트 구매"
      metadata={{ attachmentId, username: sellerUsername, returnPath: checkoutReturn }}
      returnPath={checkoutReturn}
      onPurchaseSuccess={onPurchaseSuccess}
      className="h-auto rounded-full bg-white px-4 py-2 text-xs font-semibold text-foreground hover:bg-white/90"
    >
      {formatUsd(priceKrw)} · {label}
    </PayButton>
  );
}
