"use client";

import { signIn } from "next-auth/react";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, prepareSignupVerify } from "@/actions/auth";
import { AptFloorPicker } from "@/components/apt/apt-floor-picker";
import {
  containsForbiddenAdminSequence,
  FORBIDDEN_ADMIN_SEQUENCE_MESSAGE,
} from "@/lib/forbidden-admin-sequence";
import { saveSignupDraft, saveSignupChallenge } from "@/lib/signup-draft";
import { isSignupHumanVerifyRequired } from "@/lib/turnstile-signup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { BRAND } from "@/lib/brand";
import { COUNTRIES, LOCALE_COOKIE, COUNTRY_COOKIE, LOCALE_LABELS, LOCALES } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { isValidSignupEmail } from "@/lib/signup-email-domains";
import { EmailAddressField } from "@/components/auth/email-address-field";
import { APT_DEFAULT_FLOOR } from "@/lib/apt/constants";
import { findCountry } from "@/lib/apt/world/world-countries";

export function SignupApplyForm({
  googleOAuth,
  discordOAuth,
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [locale, setLocale] = useState<Locale>("ko");
  const [countryCode, setCountryCode] = useState("KR");
  const [homeFloor, setHomeFloor] = useState(APT_DEFAULT_FLOOR);
  const [floorTaken, setFloorTaken] = useState(false);

  const showSocial = googleOAuth || discordOAuth;
  const needsHumanVerify = isSignupHumanVerifyRequired();
  const countryLabel = `${findCountry(countryCode)?.nameKo ?? countryCode} APT`;

  const handleFloorChange = useCallback((next: number) => {
    setHomeFloor(next);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string).trim().toLowerCase();
    if (!isValidSignupEmail(email)) {
      setError("올바른 이메일을 입력해 주세요. (아이디 @ 도메인)");
      setLoading(false);
      return;
    }
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

    if (floorTaken) {
      setError("선택한 층은 이미 입주 중입니다. 다른 층을 선택해 주세요.");
      setLoading(false);
      return;
    }

    try {
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
      document.cookie = `${COUNTRY_COOKIE}=${countryCode};path=/;max-age=${maxAge};SameSite=Lax`;

      const check = await prepareSignupVerify({
        email,
        username,
        password,
        name: displayName || undefined,
        locale,
        countryCode,
        homeFloor,
        website: (form.get("website") as string) || undefined,
      });

      if (!("ok" in check) || !check.ok) {
        const msg = "error" in check && check.error ? check.error : "가입 정보를 확인할 수 없습니다.";
        setError(msg);
        if (msg.includes("입주 중")) setFloorTaken(true);
        return;
      }

      if (check.message) setNotice(check.message);

      const draft = {
        email,
        username,
        password,
        name: displayName || undefined,
        locale,
        countryCode,
        homeFloor,
      };

      if (needsHumanVerify) {
        saveSignupDraft(draft);
        if ("challenge" in check && check.challenge) {
          saveSignupChallenge(check.challenge);
        }
        router.prefetch("/auth/signup/verify");
        router.prefetch(
          `/auth/email-verify?email=${encodeURIComponent(email)}&mode=signup`
        );
        router.replace("/auth/signup/verify");
        return;
      }

      const result = await registerUser({
        ...draft,
        turnstileUnavailable: true,
      });

      if (result.error) {
        setError(result.error);
        if (result.error.includes("입주 중")) setFloorTaken(true);
        return;
      }

      if (result.needsVerification) {
        sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, password);
        if (result.message) {
          sessionStorage.setItem("mocomo_signup_notice", result.message);
        }
        router.push(`/auth/email-verify?email=${encodeURIComponent(email)}&mode=signup`);
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
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={56} priority />
          </div>
          <SignupStepIndicator step={1} />
          <CardTitle className="text-2xl">{BRAND.name} 회원가입</CardTitle>
          <p className="text-sm text-muted-foreground">
            가입 정보와 아파트 입주 층을 함께 선택합니다.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <EmailAddressField required />
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
                <span className="text-xs text-muted-foreground">국가 · APT</span>
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

            <div className="rounded-xl border border-folk-terracotta/30 bg-folk-terracotta/5 p-3">
              <p className="text-xs font-bold text-folk-cobalt mb-2">아파트 입주 층 (빈 층만)</p>
              <AptFloorPicker
                countryCode={countryCode}
                countryLabel={countryLabel}
                floor={homeFloor}
                onFloorChange={handleFloorChange}
                onTakenChange={setFloorTaken}
                compact
              />
            </div>

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              className="sr-only"
              aria-hidden
            />

            {notice && (
              <p className="text-sm text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                {notice}
              </p>
            )}
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

            <Button type="submit" className="w-full rounded-xl" disabled={loading || floorTaken}>
              {loading
                ? "확인 중..."
                : needsHumanVerify
                  ? "다음 · 사람 확인"
                  : "회원가입 · 인증 메일 받기"}
            </Button>
          </form>

          {showSocial ? (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
                  또는 소셜로 가입 (층은 입주 단계에서 선택)
                </div>
              </div>
              <div className="space-y-2">
                {discordOAuth && (
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white"
                    onClick={() => signIn("discord", { callbackUrl: "/apt/move-in" })}
                  >
                    Discord로 가입
                  </Button>
                )}
                {googleOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl"
                    onClick={() => signIn("google", { callbackUrl: "/apt/move-in" })}
                  >
                    Google로 가입
                  </Button>
                )}
              </div>
            </>
          ) : null}

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있나요?{" "}
            <Link href="/auth/signin" className="text-folk-cobalt hover:underline font-medium">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
