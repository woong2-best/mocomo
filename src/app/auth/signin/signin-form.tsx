"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { GmailLocalPartField } from "@/components/auth/gmail-local-part-field";
import { NaverLocalPartField } from "@/components/auth/naver-local-part-field";
import { BRAND } from "@/lib/brand";
import { loginErrorMessage } from "@/lib/auth-login-errors";
import { buildGmailEmail, buildNaverEmail, parseGmailLocalPart, parseNaverLocalPart } from "@/lib/signup-email-domains";
import { useLocale } from "@/components/providers/locale-provider";
import { signIn, getSession } from "next-auth/react";
import { finishAddAccountFlow } from "@/lib/account-switch/add-account-flow";

function safeCallbackUrl(raw: string): string {
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export function SignInForm({
  googleOAuth,
  discordOAuth,
  twitterOAuth,
  lineOAuth,
  callbackUrl: callbackUrlProp,
  initialEmail = "",
  errorParam,
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
  twitterOAuth: boolean;
  lineOAuth: boolean;
  callbackUrl: string;
  initialEmail?: string;
  errorParam?: string | null;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const callbackUrl = safeCallbackUrl(callbackUrlProp);

  const [localPart, setLocalPart] = useState(() => parseGmailLocalPart(initialEmail));
  const [naverLocalPart, setNaverLocalPart] = useState(() => parseNaverLocalPart(initialEmail));
  const [emailProvider, setEmailProvider] = useState<"gmail" | "naver">(() =>
    initialEmail.includes("@naver.com") ? "naver" : "gmail"
  );
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalizedEmail =
      emailProvider === "naver" ? buildNaverEmail(naverLocalPart) : buildGmailEmail(localPart);
    if (!normalizedEmail) {
      setError(emailProvider === "naver" ? t("auth.invalidNaver") : t("auth.invalidGmail"));
      setLoading(false);
      return;
    }
    router.prefetch(callbackUrl);

    const result = await signIn("credentials", {
      email: normalizedEmail,
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

  const showSocial = discordOAuth || twitterOAuth || lineOAuth;

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

          {showSocial ? (
            <SocialAuthButtons
              mode="signin"
              callbackUrl={callbackUrl}
              googleOAuth={googleOAuth}
              discordOAuth={discordOAuth}
              twitterOAuth={twitterOAuth}
              lineOAuth={lineOAuth}
            />
          ) : (
            <p className="text-xs text-center text-muted-foreground">{t("auth.oauthNotConfigured")}</p>
          )}

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
              {t("auth.emailSignIn")}
            </div>
          </div>

          <form onSubmit={handleCredentials} className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={emailProvider === "gmail" ? "default" : "outline"}
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => setEmailProvider("gmail")}
              >
                Gmail
              </Button>
              <Button
                type="button"
                variant={emailProvider === "naver" ? "default" : "outline"}
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => setEmailProvider("naver")}
              >
                Naver
              </Button>
            </div>
            {emailProvider === "gmail" ? (
              <GmailLocalPartField
                value={localPart}
                onChange={setLocalPart}
                disabled={loading}
              />
            ) : (
              <NaverLocalPartField
                value={naverLocalPart}
                onChange={setNaverLocalPart}
                disabled={loading}
              />
            )}
            <Input
              type="password"
              placeholder={t("auth.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-xl"
            />
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/email-verify" className="text-primary hover:underline">
              {t("auth.emailVerifyForgot")}
            </Link>
            {" · "}
            <Link href="/auth/signup" className="text-primary hover:underline font-medium">
              {t("nav.signup")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
