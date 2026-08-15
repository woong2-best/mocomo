"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentCheckoutSheet } from "@/components/payments/payment-checkout-sheet";
import { Button } from "@/components/ui/button";
import type { PaymentIntentType } from "@prisma/client";

type Props = {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  disabled?: boolean;
  className?: string;
  showLegalNotice?: boolean;
  children: React.ReactNode;
};

/** Saved-card sheet first; new cards via Stripe Checkout */
export function PayButton({
  type,
  amount,
  orderName,
  metadata,
  disabled,
  className,
  showLegalNotice,
  children,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" className={className} disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <PaymentCheckoutSheet
        open={open}
        onOpenChange={setOpen}
        type={type}
        amount={amount}
        orderName={orderName}
        metadata={metadata}
        showLegalNotice={showLegalNotice}
        onSuccess={(result) => {
          if (result.redirectPath) router.push(result.redirectPath);
          else router.refresh();
        }}
      />
    </>
  );
}

/** @deprecated PayButton 사용 */
export const TossPayButton = PayButton;
