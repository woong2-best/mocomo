"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { buildProviderSigninHref } from "@/lib/oauth-provider-signin-shared";
import { setOAuthFlowCookieClient } from "@/lib/oauth-flow-cookie";
import { cn } from "@/lib/utils";

type SocialAuthButtonsProps = {
  mode: "signup" | "signin";
  callbackUrl?: string;
  googleOAuth: boolean;
  discordOAuth: boolean;
  twitterOAuth: boolean;
  lineOAuth: boolean;
  naverOAuth?: boolean;
  /** MoCoMo app AuthSession — use server OAuth redirect (Custom Tabs CSRF-safe). */
  fromMobile?: boolean;
  platform?: "android" | "ios";
  addAccount?: boolean;
  mobileRedirectUri?: string | null;
  onGmailSignup?: () => void;
  onNaverSignup?: () => void;
  /** Fallback when Naver OAuth env is not configured — focus @naver.com credentials. */
  onNaverSignin?: () => void;
  className?: string;
};

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function NaverIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M16.273 12.845 7.376 0H0v24h7.727V11.156L16.624 24H24V0h-7.727v12.845Z"
      />
    </svg>
  );
}

function LineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 5.985 2 10.9c0 4.425 3.926 8.13 9.23 8.83.36.077.847.236.97.542.112.276.073.705.036.99l-.17.99c-.05.292-.24 1.147 1.005.627 1.246-.52 6.691-3.94 9.124-6.744C23.176 14.02 24 12.52 24 10.9 24 5.985 19.523 2 12 2Z" />
    </svg>
  );
}

type ProviderId = "discord" | "google" | "twitter" | "naver" | "line";

type ProviderConfig = {
  id: ProviderId;
  signupKey:
    | "auth.signUpDiscord"
    | "auth.signUpGmail"
    | "auth.signUpTwitter"
    | "auth.signUpNaver"
    | "auth.signUpLine";
  signinKey:
    | "auth.signInDiscord"
    | "auth.signInGmail"
    | "auth.signInTwitter"
    | "auth.signInNaver"
    | "auth.signInLine";
  className: string;
  icon: (props: { className?: string }) => ReactNode;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "discord",
    signupKey: "auth.signUpDiscord",
    signinKey: "auth.signInDiscord",
    className: "bg-[#5865F2] hover:bg-[#4752C4] text-white border-transparent",
    icon: DiscordIcon,
  },
  {
    id: "google",
    signupKey: "auth.signUpGmail",
    signinKey: "auth.signInGmail",
    className: "bg-white hover:bg-neutral-50 text-foreground border border-border shadow-sm",
    icon: GoogleIcon,
  },
  {
    id: "naver",
    signupKey: "auth.signUpNaver",
    signinKey: "auth.signInNaver",
    className: "bg-[#03C75A] hover:bg-[#02b351] text-white border-transparent",
    icon: NaverIcon,
  },
  {
    id: "line",
    signupKey: "auth.signUpLine",
    signinKey: "auth.signInLine",
    className: "bg-[#06C755] hover:bg-[#05b34c] text-white border-transparent",
    icon: LineIcon,
  },
  {
    id: "twitter",
    signupKey: "auth.signUpTwitter",
    signinKey: "auth.signInTwitter",
    className: "bg-neutral-900 hover:bg-neutral-800 text-white border-transparent",
    icon: XIcon,
  },
];

const SIGNUP_ORDER: ProviderId[] = ["discord", "google", "naver", "line", "twitter"];
/** Matches sign-in mock: Discord → LINE → X → Gmail → Naver */
const SIGNIN_ORDER: ProviderId[] = ["discord", "line", "twitter", "google", "naver"];

export function SocialAuthButtons({
  mode,
  callbackUrl = DEFAULT_LANDING_PATH,
  googleOAuth,
  discordOAuth,
  twitterOAuth,
  lineOAuth,
  naverOAuth = false,
  fromMobile = false,
  platform = "android",
  addAccount = false,
  mobileRedirectUri = null,
  onGmailSignup,
  onNaverSignup,
  onNaverSignin,
  className,
}: SocialAuthButtonsProps) {
  const { t } = useLocale();
  const isSignup = mode === "signup";

  const oauthEnabled: Record<ProviderId, boolean> = {
    discord: discordOAuth,
    google: googleOAuth,
    twitter: twitterOAuth,
    line: lineOAuth,
    naver: naverOAuth,
  };

  function startOAuth(id: ProviderId) {
    const flow = isSignup ? "signup" : "signin";
    setOAuthFlowCookieClient(flow);
    window.location.assign(
      buildProviderSigninHref(id, {
        flow,
        callbackUrl,
        addAccount,
        mobile: fromMobile,
        platform,
        redirectUri: mobileRedirectUri,
      })
    );
  }

  function handleClick(id: ProviderId) {
    if (id === "google" && isSignup) {
      onGmailSignup?.();
      return;
    }
    if (id === "naver" && isSignup) {
      if (naverOAuth) {
        startOAuth("naver");
        return;
      }
      onNaverSignup?.();
      return;
    }
    if (id === "google" && !isSignup) {
      if (!googleOAuth) return;
      startOAuth("google");
      return;
    }
    if (id === "naver" && !isSignup) {
      if (!naverOAuth) {
        onNaverSignin?.();
        return;
      }
      startOAuth("naver");
      return;
    }
    if (!oauthEnabled[id]) return;
    startOAuth(id);
  }

  const order = isSignup ? SIGNUP_ORDER : SIGNIN_ORDER;
  const byId = new Map(PROVIDERS.map((p) => [p.id, p]));
  const providers = order.map((id) => byId.get(id)!);

  return (
    <div className={cn("space-y-2.5", className)}>
      {providers.map((provider) => {
        const Icon = provider.icon;
        const label = t(isSignup ? provider.signupKey : provider.signinKey);
        const isGmailSignup = provider.id === "google" && isSignup;
        const isNaverSignup = provider.id === "naver" && isSignup && !naverOAuth;
        const isNaverSignin = provider.id === "naver" && !isSignup && !naverOAuth;
        const disabled =
          !isGmailSignup &&
          !isNaverSignup &&
          !isNaverSignin &&
          !oauthEnabled[provider.id];

        return (
          <Button
            key={provider.id}
            type="button"
            disabled={disabled}
            className={cn(
              "w-full h-11 rounded-xl font-medium gap-3",
              provider.className,
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => handleClick(provider.id)}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Button>
        );
      })}
    </div>
  );
}
