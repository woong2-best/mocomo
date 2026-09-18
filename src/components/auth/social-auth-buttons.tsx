"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { buildProviderSigninHref } from "@/lib/oauth-provider-signin-shared";
import { setOAuthFlowCookieClient } from "@/lib/oauth-flow-cookie";
import { cn } from "@/lib/utils";

type SocialAuthButtonsProps = {
  /** Unified entry: Google OAuth for both new and existing accounts. */
  mode?: "signup" | "signin";
  callbackUrl?: string;
  googleOAuth: boolean;
  /** MoCoMo app AuthSession — use server OAuth redirect (Custom Tabs CSRF-safe). */
  fromMobile?: boolean;
  platform?: "android" | "ios";
  addAccount?: boolean;
  mobileRedirectUri?: string | null;
  className?: string;
};

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function SocialAuthButtons({
  mode = "signin",
  callbackUrl = DEFAULT_LANDING_PATH,
  googleOAuth,
  fromMobile = false,
  platform = "android",
  addAccount = false,
  mobileRedirectUri = null,
  className,
}: SocialAuthButtonsProps) {
  const { t } = useLocale();
  const flow = mode === "signup" ? "signup" : "signin";
  const label = t(mode === "signup" ? "auth.signUpGoogle" : "auth.continueWithGoogle");
  const disabled = !googleOAuth;

  function handleClick() {
    if (!googleOAuth) return;
    setOAuthFlowCookieClient(flow);
    window.location.assign(
      buildProviderSigninHref("google", {
        flow,
        callbackUrl,
        addAccount,
        mobile: fromMobile,
        platform,
        redirectUri: mobileRedirectUri,
      })
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      <Button
        type="button"
        disabled={disabled}
        className={cn(
          "w-full h-11 rounded-xl font-medium gap-3",
          // White Google CTA — force black label (dark theme text-foreground is invisible).
          "bg-white hover:bg-neutral-50 !text-neutral-900 border border-neutral-200 shadow-sm",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleClick}
      >
        <GoogleIcon className="h-5 w-5 shrink-0" />
        <span className="text-neutral-900">{label}</span>
      </Button>
    </div>
  );
}
