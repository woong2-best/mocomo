"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function MobilePaymentReturnInner() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!sessionId) return;
    const target = `mocomo://payment/success?session_id=${encodeURIComponent(sessionId)}`;
    window.location.replace(target);
  }, [sessionId]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">앱으로 돌아가는 중…</p>
    </main>
  );
}

/** Stripe → MoCoMo app deep link after mobile checkout */
export default function MobilePaymentReturnPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">앱으로 돌아가는 중…</p>
        </main>
      }
    >
      <MobilePaymentReturnInner />
    </Suspense>
  );
}
