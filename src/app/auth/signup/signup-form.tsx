"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/actions/auth";
import {
  containsForbiddenAdminSequence,
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
} from "@/lib/forbidden-admin-sequence";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { BRAND } from "@/lib/brand";
import { isTurnstileConfigured } from "@/lib/turnstile-client";
import { COUNTRIES, LOCALE_COOKIE, COUNTRY_COOKIE, LOCALE_LABELS, LOCALES } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";

export function SignUpForm({
  googleOAuth,
  discordOAuth,
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>("ko");
  const [countryCode, setCountryCode] = useState("KR");
  const [turnstileToken, setTurnstileToken] = useState("");

  const showSocial = googleOAuth || discordOAuth;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string).trim().toLowerCase();
    const password = form.get("password") as string;
    const username = ((form.get("username") as string) || "").trim().toLowerCase();
    const displayName = ((form.get("name") as string) || "").trim();

    if (
      containsForbiddenAdminSequence(username) ||
      (displayName && containsForbiddenAdminSequence(displayName))
    ) {
      setError(FORBIDDEN_ADMIN_SEQUENCE_MESSAGE);
      setLoading(false);
      return;
    }

    if (isTurnstileConfigured() && !turnstileToken) {
      setError("아래 보안 확인을 완료해 주세요.");
      setLoading(false);
      return;
    }

    try {
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
      document.cookie = `${COUNTRY_COOKIE}=${countryCode};path=/;max-age=${maxAge};SameSite=Lax`;

      const result = await registerUser({
        email,
        username,
        password,
        name: (form.get("name") as string) || undefined,
        locale,
        countryCode,
        turnstileToken: turnstileToken || undefined,
        website: (form.get("website") as string) || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.needsVerification) {
        sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, password);
        if (result.message) {
          sessionStorage.setItem("mocomo_signup_notice", result.message);
        }
        router.push(`/auth/email-verify?email=${encodeURIComponent(email)}&mode=signup`);
        return;
      }
    } catch {
      setError("서버 연결 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center mb-2 overflow-hidden p-1">
            <BrandLogo size={56} priority />
          </div>
          <CardTitle className="text-2xl">{BRAND.name} 회원가입</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{BRAND.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              name="email"
              type="email"
              placeholder="이메일"
              required
              autoComplete="email"
              className="rounded-xl"
            />
            <Input
              name="username"
              placeholder="닉네임 (영문·숫자·_)"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              className="rounded-xl"
            />
            <Input
              name="name"
              placeholder="표시 이름 (선택)"
              autoComplete="name"
              className="rounded-xl"
            />
            <Input
              name="password"
              type="password"
              placeholder="비밀번호 (8자 이상)"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-xl"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">국가</span>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.nameKo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">언어</span>
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as Locale)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                >
                  {LOCALES.map((l) => (
                    <option key={l} value={l}>
                      {LOCALE_LABELS[l]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="sr-only"
              aria-hidden
            />
            <TurnstileField
              className="flex justify-center min-h-[65px]"
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
            />
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              회원가입 시{" "}
              <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                이용약관
              </Link>
              ,{" "}
              <Link href="/legal/privacy" className="text-primary hover:underline" target="_blank">
                개인정보처리방침
              </Link>
              ,{" "}
              <Link href="/legal/policy" className="text-primary hover:underline" target="_blank">
                운영정책
              </Link>
              에 동의한 것으로 간주됩니다.
            </p>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </Button>
          </form>

          {showSocial ? (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
                  또는 소셜로 가입
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {googleOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                  >
                    Google
                  </Button>
                )}
                {discordOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => signIn("discord", { callbackUrl: "/" })}
                  >
                    Discord
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              Google 가입은 Vercel에 OAuth 키 추가 후 사용할 수 있습니다.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있나요?{" "}
            <Link href="/auth/signin" className="text-[#1e88e5] hover:underline font-medium">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
