"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

function AuthenticateInner() {
  const params = useSearchParams();
  const clientSecret = params.get("client_secret");
  const orderId = params.get("order_id");
  const returnTo = params.get("return_to") ?? "mocomo://payment/success";
  const [message, setMessage] = useState("카드 인증 중…");

  useEffect(() => {
    if (!clientSecret || !orderId) {
      setMessage("잘못된 인증 요청입니다.");
      return;
    }

    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk) {
      setMessage("Stripe 설정이 없습니다.");
      return;
    }

    void (async () => {
      const stripe = await loadStripe(pk);
      if (!stripe) {
        setMessage("Stripe를 불러오지 못했습니다.");
        return;
      }
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret);
      if (error) {
        setMessage(error.message ?? "인증에 실패했습니다.");
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        setMessage("결제가 완료되지 않았습니다.");
        return;
      }
      const target = `${returnTo}${returnTo.includes("?") ? "&" : "?"}order_id=${encodeURIComponent(orderId)}&pi=${encodeURIComponent(paymentIntent.id)}`;
      window.location.replace(target);
    })();
  }, [clientSecret, orderId, returnTo]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}

/** 3DS step for mobile saved-card payments */
export default function PaymentAuthenticatePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">카드 인증 중…</p>
        </main>
      }
    >
      <AuthenticateInner />
    </Suspense>
  );
}
