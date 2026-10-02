"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { PayButton } from "@/components/payments/pay-button";
import { formatUsd } from "@/lib/money";

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
        {t("market.stripe_api")}
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
      {t("market.buyForPrice", { price: formatUsd(price) })}
    </PayButton>
  );
}
