"use client";

import { TossPayButton } from "@/components/payments/toss-pay-button";

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
        결제 연동 후 구매할 수 있습니다. (TOSS_SECRET_KEY 설정 필요)
      </p>
    );
  }

  return (
    <TossPayButton
      type="PRODUCT"
      amount={price}
      orderName={title}
      metadata={{ productId }}
      className="w-full rounded-xl btn-rainbow"
    >
      {price.toLocaleString()}원 구매
    </TossPayButton>
  );
}
