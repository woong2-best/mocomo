"use client";

import { useState, useTransition } from "react";
import { createStripeCheckout } from "@/actions/monetization";
import { Button } from "@/components/ui/button";
import type { PaymentIntentType } from "@prisma/client";

type Props = {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Stripe Checkout으로 이동 (카드·해외결제·간편결제는 Stripe 대시보드에서 활성화) */
export function PayButton({
  type,
  amount,
  orderName,
  metadata,
  disabled,
  className,
  children,
}: Props) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function pay() {
    setError("");
    startTransition(async () => {
      const res = await createStripeCheckout({ type, amount, orderName, metadata });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (!("checkoutUrl" in res) || !res.checkoutUrl) {
        setError("결제 준비에 실패했습니다.");
        return;
      }
      window.location.href = res.checkoutUrl;
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" className={className} disabled={disabled || pending} onClick={pay}>
        {pending ? "결제 준비 중..." : children}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** @deprecated PayButton 사용 */
export const TossPayButton = PayButton;
