"use client";

/** Stripe Hosted Onboarding — 인앱 WebView에서는 외부 브라우저로 열기 */
export function openStripeConnectOnboardingUrl(url: string, fromApp = false) {
  if (typeof window === "undefined") return;

  const ua = navigator.userAgent || "";
  const embeddedWebView =
    fromApp ||
    /wv\)|WebView|FB_IAB|Instagram|Line\//i.test(ua) ||
    (window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView != null;

  if (embeddedWebView) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.assign(
        `/market/seller/connect-external?target=${encodeURIComponent(url)}`
      );
    }
    return;
  }

  window.location.assign(url);
}
