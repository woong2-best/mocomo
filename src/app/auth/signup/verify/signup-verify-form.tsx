"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/actions/auth";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { clearSignupDraft, loadSignupDraft } from "@/lib/signup-draft";
import { isTurnstileConfigured } from "@/lib/turnstile-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";

export function SignupVerifyForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);

  const completeSignup = useCallback(
    async (token: string, unavailable: boolean) => {
      const draft = loadSignupDraft();
      if (!draft) {
        setError("가입 정보가 없습니다. 처음부터 다시 진행해 주세요.");
        router.replace("/auth/signup/apply");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await registerUser({
          email: draft.email,
          username: draft.username,
          password: draft.password,
          name: draft.name,
          locale: draft.locale,
          countryCode: draft.countryCode,
          turnstileToken: token || undefined,
          turnstileUnavailable: unavailable,
        });

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.needsVerification) {
          clearSignupDraft();
          sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, draft.password);
          if (result.message) {
            sessionStorage.setItem("mocomo_signup_notice", result.message);
          }
          router.push(`/auth/email-verify?email=${encodeURIComponent(draft.email)}&mode=signup`);
        }
      } catch {
        setError("서버 연결 오류입니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const draft = loadSignupDraft();
    if (!draft) {
      router.replace("/auth/signup/apply");
      return;
    }
    setEmail(draft.email);
    setReady(true);

    if (!isTurnstileConfigured()) {
      void completeSignup("", true);
    }
  }, [router, completeSignup]);

  async function handleContinue() {
    if (!turnstileToken && !turnstileUnavailable) {
      setError("보안 확인을 완료하거나 「제한 모드로 계속」을 선택해 주세요.");
      return;
    }
    await completeSignup(turnstileToken, turnstileUnavailable);
  }

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
        준비 중...
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={56} priority />
          </div>
          <SignupStepIndicator step={2} />
          <CardTitle className="text-2xl">사람인지 확인</CardTitle>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{email}</span> 로 인증 메일을 보냅니다.
            확인을 마친 뒤 아래 버튼을 눌러 주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <TurnstileField
              className="flex justify-center min-h-[72px]"
              showSkipImmediately
              onToken={(t) => {
                setTurnstileToken(t);
                setError("");
              }}
              onExpire={() => setTurnstileToken("")}
              onUnavailable={setTurnstileUnavailable}
            />
            {turnstileUnavailable ? (
              <p className="text-xs text-amber-700 text-center font-medium">요청 제한 모드로 진행합니다.</p>
            ) : turnstileToken ? (
              <p className="text-xs text-emerald-600 text-center font-medium">보안 확인 완료</p>
            ) : (
              <p className="text-xs text-muted-foreground text-center">위젯이 비어 있으면 「제한 모드로 계속」을 눌러 주세요.</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={loading || (!turnstileToken && !turnstileUnavailable)}
            onClick={() => void handleContinue()}
          >
            {loading ? "인증 메일 발송 중..." : "확인 완료 · 인증 메일 받기"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/signup/apply" className="text-[#1e88e5] hover:underline">
              가입 정보 수정
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
