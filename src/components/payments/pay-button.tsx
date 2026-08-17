"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
  returnPath?: string;
  onPurchaseSuccess?: () => void;
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
  returnPath,
  onPurchaseSuccess,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sessionState = useSession();
  const session = sessionState?.data;
  const status = sessionState?.status ?? "unauthenticated";
  const [open, setOpen] = useState(false);

  function openCheckout() {
    if (status === "loading") return;
    if (!session?.user) {
      const back = returnPath ?? pathname ?? "/";
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(back)}`);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <Button type="button" className={className} disabled={disabled} onClick={openCheckout}>
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
        returnPath={returnPath ?? pathname ?? "/"}
        onSuccess={(result) => {
          onPurchaseSuccess?.();
          if (result.redirectPath) router.push(result.redirectPath);
          else router.refresh();
        }}
      />
    </>
  );
}

/** @deprecated PayButton 사용 */
export const TossPayButton = PayButton;
