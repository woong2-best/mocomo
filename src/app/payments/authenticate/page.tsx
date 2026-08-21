"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { confirmCheckoutPayment } from "@/actions/checkout-payment";
import { stripePaymentIntentReturnUrlClient } from "@/lib/stripe-payment-return-url";

function isAppDeepLink(target: string) {
  return target.startsWith("mocomo://") || target.startsWith("exp://");
}

function resolveWebRedirect(target: string, fallbackPath: string) {
  if (target.startsWith("http://") || target.startsWith("https://")) return target;
  const path = target.startsWith("/") ? target : `/${target}`;
  return `${window.location.origin}${path === "/payments/authenticate" ? fallbackPath : path}`;
}

function AuthenticateInner() {
  const params = useSearchParams();
  const clientSecret =
    params.get("payment_intent_client_secret") ?? params.get("client_secret");
  const orderId = params.get("order_id");
  const returnTo = params.get("return_to") ?? "mocomo://payment/success";
  const redirectStatus = params.get("redirect_status");
  const [message, setMessage] = useState("카드 인증 중…");

  useEffect(() => {
    if (!orderId) {
      setMessage("잘못된 인증 요청입니다.");
      return;
    }

    async function finalizeAndRedirect(oid: string, target: string, paymentIntentId?: string) {
      const done = await confirmCheckoutPayment(oid);
      if ("error" in done && done.error) {
        setMessage(done.error);
        return;
      }

      if (isAppDeepLink(target)) {
        const sep = target.includes("?") ? "&" : "?";
        const piQuery = paymentIntentId ? `&pi=${encodeURIComponent(paymentIntentId)}` : "";
        window.location.replace(`${target}${sep}order_id=${encodeURIComponent(oid)}${piQuery}`);
        return;
      }

      const redirectPath =
        "redirectPath" in done && typeof done.redirectPath === "string"
          ? done.redirectPath
          : target;
      window.location.replace(resolveWebRedirect(redirectPath, "/"));
    }

    if (redirectStatus === "failed") {
      setMessage("카드 인증에 실패했습니다.");
      return;
    }

    if (redirectStatus === "succeeded") {
      void finalizeAndRedirect(orderId, returnTo, params.get("payment_intent") ?? undefined);
      return;
    }

    if (!clientSecret) {
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

      const returnUrl = stripePaymentIntentReturnUrlClient(orderId, returnTo);
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        return_url: returnUrl,
      });

      if (error) {
        setMessage(error.message ?? "인증에 실패했습니다.");
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        setMessage("결제가 완료되지 않았습니다.");
        return;
      }

      await finalizeAndRedirect(orderId, returnTo, paymentIntent.id);
    })();
  }, [clientSecret, orderId, redirectStatus, returnTo]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}

/** 3DS / redirect return for saved-card payments (web + mobile) */
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
