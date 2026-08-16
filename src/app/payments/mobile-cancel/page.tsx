"use client";

import { useEffect } from "react";

/** Stripe cancel → MoCoMo app */
export default function MobilePaymentCancelPage() {
  useEffect(() => {
    window.location.replace("mocomo://payment/cancel");
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">앱으로 돌아가는 중…</p>
    </main>
  );
}
