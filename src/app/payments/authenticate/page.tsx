"use client";


import { errorText } from "@/lib/i18n/error-text";
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
  const [message, setMessage] = useState("Verifying card…");

  useEffect(() => {
    if (!orderId) {
      setMessage("Invalid verification request.");
      return;
    }

    async function finalizeAndRedirect(oid: string, target: string, paymentIntentId?: string) {
      const done = await confirmCheckoutPayment(oid);
      if ("error" in done && done.error) {
        setMessage(errorText(done.error));
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
      setMessage("Card verification failed.");
      return;
    }

    if (redirectStatus === "succeeded") {
      void finalizeAndRedirect(orderId, returnTo, params.get("payment_intent") ?? undefined);
      return;
    }

    if (!clientSecret) {
      setMessage("Invalid verification request.");
      return;
    }

    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk) {
      setMessage("Stripe is not configured.");
      return;
    }

    void (async () => {
      const stripe = await loadStripe(pk);
      if (!stripe) {
        setMessage("Couldn't load Stripe.");
        return;
      }

      const returnUrl = stripePaymentIntentReturnUrlClient(orderId, returnTo);
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        return_url: returnUrl,
      });

      if (error) {
        setMessage(error.message ?? "Authentication failed.");
        return;
      }
      if (paymentIntent?.status !== "succeeded") {
        setMessage("Payment not completed.");
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
          <p className="text-sm text-muted-foreground">Verifying card…</p>
        </main>
      }
    >
      <AuthenticateInner />
    </Suspense>
  );
}
