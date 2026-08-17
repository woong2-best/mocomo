"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PaymentIntentType } from "@prisma/client";
import { confirmPaymentMethodSetup } from "@/actions/payment-methods";
import { PaymentCheckoutSheet } from "@/components/payments/payment-checkout-sheet";

export const CHECKOUT_RESUME_STORAGE_KEY = "mocomo_resume_checkout";

export type StoredCheckoutPayload = {
  type: PaymentIntentType;
  amount: number;
  orderName: string;
  metadata: Record<string, unknown>;
  returnPath: string;
};

export function saveCheckoutForResume(payload: StoredCheckoutPayload) {
  try {
    sessionStorage.setItem(CHECKOUT_RESUME_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Stripe 카드 등록 후 돌아왔을 때 결제 시트 자동 재개 */
function CheckoutResumeHandlerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [resume, setResume] = useState<StoredCheckoutPayload | null>(null);
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const setup = params.get("setup");
    const sessionId = params.get("session_id");
    if (setup !== "success" || !sessionId) return;
    if (handledRef.current === sessionId) return;
    handledRef.current = sessionId;

    void (async () => {
      await confirmPaymentMethodSetup(sessionId);

      let stored: StoredCheckoutPayload | null = null;
      try {
        const raw = sessionStorage.getItem(CHECKOUT_RESUME_STORAGE_KEY);
        if (raw) {
          stored = JSON.parse(raw) as StoredCheckoutPayload;
          sessionStorage.removeItem(CHECKOUT_RESUME_STORAGE_KEY);
        }
      } catch {
        stored = null;
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("setup");
      url.searchParams.delete("session_id");
      router.replace(`${url.pathname}${url.search}${url.hash}`);
      router.refresh();

      if (stored) setResume(stored);
    })();
  }, [params, router]);

  if (!resume) return null;

  return (
    <PaymentCheckoutSheet
      open
      onOpenChange={(open) => {
        if (!open) setResume(null);
      }}
      type={resume.type}
      amount={resume.amount}
      orderName={resume.orderName}
      metadata={resume.metadata}
      returnPath={resume.returnPath || pathname || "/"}
      onSuccess={() => {
        setResume(null);
        router.refresh();
      }}
    />
  );
}

export function CheckoutResumeHandler() {
  return (
    <Suspense fallback={null}>
      <CheckoutResumeHandlerInner />
    </Suspense>
  );
}
