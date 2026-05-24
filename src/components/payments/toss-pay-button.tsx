"use client";

import { useState, useTransition } from "react";
import { createPaymentIntent } from "@/actions/monetization";
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

export function TossPayButton({
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
      const res = await createPaymentIntent({ type, amount, metadata });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }

      try {
        const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
        const toss = await loadTossPayments(res.clientKey);
        const origin = window.location.origin;
        await toss.requestPayment("카드", {
          amount: res.amount,
          orderId: res.orderId,
          orderName,
          successUrl: `${origin}/payments/success`,
          failUrl: `${origin}/payments/fail`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "결제가 취소되었습니다.";
        if (!msg.includes("USER_CANCEL")) setError(msg);
      }
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
