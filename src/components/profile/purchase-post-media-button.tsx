"use client";

import { PayButton } from "@/components/payments/pay-button";
import { formatUsd } from "@/lib/money";
import { usePathname } from "next/navigation";

export function PurchasePostMediaButton({
  mediaId,
  priceKrw,
  label = "결제하기",
  paymentsEnabled,
  username,
  postId,
  variant = "button",
  returnPath,
  onPurchaseSuccess,
}: {
  mediaId?: string;
  priceKrw: number;
  label?: string;
  paymentsEnabled: boolean;
  username?: string;
  postId?: string;
  /** button: pill CTA · label: Twitter-style white text under lock */
  variant?: "button" | "label";
  returnPath?: string;
  onPurchaseSuccess?: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const checkoutReturn = returnPath ?? pathname;

  if (!mediaId) {
    return null;
  }
  if (!paymentsEnabled) {
    return (
      <p className="text-[13px] font-semibold text-white/90 text-center px-2">
        {variant === "label" ? label : "결제 연동 후 구매할 수 있습니다."}
      </p>
    );
  }

  if (variant === "label") {
    return (
      <div className="flex flex-col items-center gap-1">
        <PayButton
          type="POST_MEDIA"
          amount={priceKrw}
          orderName={label}
          metadata={{ mediaId, username, postId, returnPath: checkoutReturn }}
          returnPath={checkoutReturn}
          onPurchaseSuccess={onPurchaseSuccess}
          className="h-auto rounded-none bg-transparent p-0 text-[13px] font-semibold text-white shadow-none hover:bg-transparent hover:underline"
        >
          {label}
        </PayButton>
      </div>
    );
  }

  return (
    <PayButton
      type="POST_MEDIA"
      amount={priceKrw}
      orderName={label}
      metadata={{ mediaId, username, postId, returnPath: checkoutReturn }}
      returnPath={checkoutReturn}
      onPurchaseSuccess={onPurchaseSuccess}
      className="rounded-full h-9 px-4 text-xs gap-1.5 bg-white text-foreground hover:bg-white/90"
    >
      {formatUsd(priceKrw)} · {label}
    </PayButton>
  );
}
