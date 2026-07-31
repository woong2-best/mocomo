"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BRAND } from "@/lib/brand";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { mobileAuthCompletePath } from "@/lib/mobile-oauth-handoff";
import { useLocale } from "@/components/providers/locale-provider";

function AuthLayoutHeaderInner() {
  const { t } = useLocale();
  const params = useSearchParams();
  const fromMobile = params.get("from") === "mobile";
  const platform = params.get("platform") === "ios" ? "ios" : "android";
  const mobileQs = fromMobile ? `?from=mobile&platform=${platform}` : "";
  const complete = mobileAuthCompletePath(platform);
  const signinHref = fromMobile
    ? `/auth/signin${mobileQs}&callbackUrl=${encodeURIComponent(complete)}`
    : "/auth/signin";
  const signupHref = fromMobile ? `/auth/signup/apply${mobileQs}` : "/auth/signup";

  return (
    <header className="auth-layout-marketing-header flex items-center justify-between px-4 py-3 border-b border-border bg-background/95">
      <Link href={DEFAULT_LANDING_PATH} className="font-black text-lg">
        {BRAND.name}
      </Link>
      <div className="flex items-center gap-3 text-sm">
        <Link href={signinHref} className="text-muted-foreground hover:text-foreground">
          {t("nav.signin")}
        </Link>
        <Link href={signupHref} className="font-semibold text-primary hover:underline">
          {t("nav.signup")}
        </Link>
      </div>
    </header>
  );
}

export function AuthLayoutHeader() {
  return (
    <Suspense
      fallback={
        <header className="auth-layout-marketing-header flex items-center justify-between px-4 py-3 border-b border-border bg-background/95">
          <span className="font-black text-lg">{BRAND.name}</span>
        </header>
      }
    >
      <AuthLayoutHeaderInner />
    </Suspense>
  );
}
