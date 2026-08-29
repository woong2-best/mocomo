"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PaymentCheckoutSheet } from "@/components/payments/payment-checkout-sheet";
import { Button } from "@/components/ui/button";
import { isAdultContent } from "@/lib/content-rating";
import { ADULT_MONETIZATION_BANNED_SHORT } from "@/lib/adult-monetization-ban";
import type { ContentRating, PaymentIntentType } from "@prisma/client";

type Props = {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  contentRating?: ContentRating | boolean;
  disabled?: boolean;
  className?: string;
  showLegalNotice?: boolean;
  returnPath?: string;
  onPurchaseSuccess?: () => void | Promise<void>;
  children: React.ReactNode;
};

/** Saved-card sheet first; new cards via Stripe Checkout. 성인 콘텐츠 유료화 금지. */
export function PayButton({
  type,
  amount,
  orderName,
  metadata,
  contentRating = "GENERAL",
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

  const isAdult = isAdultContent(contentRating);
  const blocked = isAdult;

  function openCheckout() {
    if (status === "loading") return;
    if (blocked) return;
    if (!session?.user) {
      const back = returnPath ?? pathname ?? "/";
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(back)}`);
      return;
    }
    setOpen(true);
  }

  async function handleSuccess(result: { type: string; redirectPath?: string }) {
    try {
      await onPurchaseSuccess?.();
    } finally {
      router.refresh();
      const current = (returnPath ?? pathname ?? "/").split("?")[0];
      const dest = result.redirectPath?.split("?")[0];
      if (dest && dest !== current) {
        router.push(result.redirectPath!);
      }
    }
  }

  return (
    <>
      <Button
        type="button"
        className={className}
        disabled={disabled || blocked}
        title={blocked ? ADULT_MONETIZATION_BANNED_SHORT : undefined}
        onClick={openCheckout}
      >
        {children}
      </Button>
      {!blocked ? (
        <PaymentCheckoutSheet
          open={open}
          onOpenChange={setOpen}
          type={type}
          amount={amount}
          orderName={orderName}
          metadata={metadata}
          showLegalNotice={showLegalNotice}
          returnPath={returnPath ?? pathname ?? "/"}
          onSuccess={handleSuccess}
        />
      ) : null}
    </>
  );
}

/** @deprecated PayButton 사용 */
export const TossPayButton = PayButton;
