"use client";

import { PayButton } from "@/components/payments/pay-button";

export function PurchaseProductButton({
  productId,
  price,
  title,
  paymentsEnabled,
}: {
  productId: string;
  price: number;
  title: string;
  paymentsEnabled: boolean;
}) {
  if (!paymentsEnabled) {
    return (
      <p className="text-sm text-center text-muted-foreground py-2">
        결제 연동 후 구매할 수 있습니다. (Stripe API 키 설정 필요)
      </p>
    );
  }

  return (
    <PayButton
      type="PRODUCT"
      amount={price}
      orderName={title}
      metadata={{ productId }}
      className="w-full rounded-xl"
    >
      {price.toLocaleString()}원 구매
    </PayButton>
  );
}
