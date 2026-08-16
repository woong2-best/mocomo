"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { BRAND } from "@/lib/brand";
import { loginErrorMessage } from "@/lib/auth-login-errors";
import { useLocale } from "@/components/providers/locale-provider";
import { signIn, getSession } from "next-auth/react";
import { finishAddAccountFlow } from "@/lib/account-switch/add-account-flow";
import { persistOAuthFlowIntent } from "@/lib/oauth-flow-cookie";

function safeCallbackUrl(raw: string): string {
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

function normalizeLoginId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("@")) return trimmed.slice(1).trim();
  return trimmed;
}

export function SignInForm({
  googleOAuth,
  discordOAuth,
  twitterOAuth,
  lineOAuth,
  naverOAuth,
  callbackUrl: callbackUrlProp,
  initialEmail = "",
  errorParam,
  fromMobile = false,
  platform = "android",
  addAccount = false,
  mobileRedirectUri = null,
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
  twitterOAuth: boolean;
  lineOAuth: boolean;
  naverOAuth: boolean;
  callbackUrl: string;
  initialEmail?: string;
  errorParam?: string | null;
  fromMobile?: boolean;
  platform?: "android" | "ios";
  addAccount?: boolean;
  mobileRedirectUri?: string | null;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const callbackUrl = safeCallbackUrl(callbackUrlProp);
  const mobileQs = fromMobile ? `?from=mobile&platform=${platform}` : "";
  const signupHref = fromMobile
    ? `/auth/signup/apply${mobileQs}&callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/auth/signup";
  const emailVerifyHref = fromMobile
    ? `/auth/email-verify${mobileQs}`
    : "/auth/email-verify";
  const forgotHref = fromMobile
    ? `/auth/email-verify${mobileQs}&mode=reset`
    : "/auth/email-verify?mode=reset";

  const loginInputRef = useRef<HTMLInputElement>(null);
  const [loginId, setLoginId] = useState(() => {
    if (!initialEmail) return "";
    if (initialEmail.includes("@")) return initialEmail;
    return initialEmail.startsWith("@") ? initialEmail.slice(1) : initialEmail;
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void persistOAuthFlowIntent("signin").catch(() => undefined);
  }, []);

  const bannedNotice =
    errorParam === "banned"
      ? "이 계정은 이용이 제한되어 있습니다. 문의가 필요하면 운영자에게 연락해 주세요."
      : errorParam === "account_deleted"
        ? "탈퇴한 계정입니다. 복구 기간이 지났거나 영구 삭제되었습니다."
        : "";

  const callbackErrorMessage =
    errorParam === "Configuration"
      ? googleOAuth
        ? "서버 OAuth 설정 오류입니다. Vercel 환경 변수를 확인한 뒤 Redeploy 하세요."
        : "Google 로그인이 아직 설정되지 않았습니다. Vercel에 AUTH_GOOGLE_ID·AUTH_GOOGLE_SECRET을 추가하거나, 이메일로 로그인하세요."
      : errorParam === "OAuthAccountNotLinked"
        ? "이 이메일은 다른 로그인 방식으로 가입되어 있습니다."
        : errorParam
          ? "로그인에 실패했습니다. 다시 시도해 주세요."
          : "";

  function focusCredentials() {
    loginInputRef.current?.focus();
    loginInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalized = normalizeLoginId(loginId);
    if (!normalized) {
      setLoading(false);
      return;
    }
    router.prefetch(callbackUrl);

    const result = await signIn("credentials", {
      email: normalized,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error || result?.ok === false) {
      const code =
        typeof result === "object" && result && "code" in result
          ? String((result as { code?: string }).code ?? "")
          : undefined;
      setError(loginErrorMessage(code || result?.error, result?.error));
      return;
    }

    await getSession();
    await finishAddAccountFlow();
    router.refresh();
    router.replace(callbackUrl);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold">
              {t("auth.signInTitle", { brand: BRAND.name })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t("brand.tagline")}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {(error || bannedNotice || callbackErrorMessage) && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
              {error || bannedNotice || callbackErrorMessage}
            </p>
          )}

          <SocialAuthButtons
            mode="signin"
            callbackUrl={callbackUrl}
            googleOAuth={googleOAuth}
            discordOAuth={discordOAuth}
            twitterOAuth={twitterOAuth}
            lineOAuth={lineOAuth}
            naverOAuth={naverOAuth}
            fromMobile={fromMobile}
            platform={platform}
            addAccount={addAccount}
            mobileRedirectUri={mobileRedirectUri}
            onNaverSignin={focusCredentials}
          />

          <form onSubmit={handleCredentials} className="space-y-3 pt-1">
            <Input
              ref={loginInputRef}
              type="text"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t("auth.loginIdPlaceholder")}
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              autoComplete="username"
              className="rounded-xl h-11"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordSimple")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="rounded-xl h-11 pr-11"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="submit" className="w-full rounded-xl h-11" disabled={loading}>
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link href={emailVerifyHref} className="text-primary hover:underline">
              {t("auth.emailVerifyLink")}
            </Link>
            {" · "}
            <Link href={forgotHref} className="text-primary hover:underline">
              {t("auth.passwordResetTab")}
            </Link>
            {" · "}
            <Link href={signupHref} className="text-primary hover:underline font-medium">
              {t("nav.signup")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
