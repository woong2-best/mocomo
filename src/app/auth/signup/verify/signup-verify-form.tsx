"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { issueSignupHumanChallenge, registerUser } from "@/actions/auth";
import { SignupHumanChallenge } from "@/components/auth/signup-human-challenge";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import {
  clearSignupDraft,
  loadSignupDraft,
  loadSignupChallenge,
  saveSignupChallenge,
} from "@/lib/signup-draft";
import type { HumanChallengeQuestion } from "@/lib/human-challenge-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";

export function SignupVerifyForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<HumanChallengeQuestion | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [bootError, setBootError] = useState("");

  const loadChallenge = useCallback(async () => {
    try {
      const next = await issueSignupHumanChallenge();
      setChallenge(next);
      setSelectedId("");
      setError("");
    } catch {
      setBootError("확인 문제를 불러오지 못했습니다. 새로고침해 주세요.");
    }
  }, []);

  useEffect(() => {
    const draft = loadSignupDraft();
    if (!draft) {
      router.replace("/auth/signup/apply");
      return;
    }
    setEmail(draft.email);
    router.prefetch(
      `/auth/email-verify?email=${encodeURIComponent(draft.email)}&mode=signup`
    );
    const cached = loadSignupChallenge();
    if (cached) {
      setChallenge(cached);
      return;
    }
    void loadChallenge();
  }, [router, loadChallenge]);

  async function handleContinue() {
    const draft = loadSignupDraft();
    if (!draft) {
      router.replace("/auth/signup/apply");
      return;
    }
    if (!challenge) {
      setError("확인 문제를 불러오는 중입니다.");
      return;
    }
    if (!selectedId) {
      setError("정답을 골라 주세요.");
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
        homeFloor: draft.homeFloor,
        availabilityPrechecked: true,
        humanChallengeToken: challenge.token,
        humanChallengeAnswer: selectedId,
        turnstileUnavailable: true,
      });

      if (result.error) {
        setError(result.error);
        if (result.error.includes("정답") || result.error.includes("만료")) {
          await loadChallenge();
        }
        return;
      }

      if (result.needsVerification) {
        clearSignupDraft();
        sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, draft.password);
        if (result.message) {
          sessionStorage.setItem("mocomo_signup_notice", result.message);
        }
        router.replace(
          `/auth/email-verify?email=${encodeURIComponent(draft.email)}&mode=signup`
        );
        return;
      }
    } catch {
      setError("서버 연결 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (bootError) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl">
          <CardContent className="pt-6 space-y-3 text-center text-sm">
            <p className="text-destructive">{bootError}</p>
            <Button type="button" className="rounded-xl" onClick={() => window.location.reload()}>
              새로고침
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href="/auth/signup/apply">가입 정보로 돌아가기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
        확인 문제 준비 중...
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
            <span className="font-medium text-foreground">{email}</span>로 인증 메일을 보냅니다.
            아래 퀴즈를 푼 뒤 계속해 주세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignupHumanChallenge
            challenge={challenge}
            loading={loading}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRefresh={() => void loadChallenge()}
          />

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
          )}

          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={loading || !selectedId}
            onClick={() => void handleContinue()}
          >
            {loading ? "인증 메일 발송 중..." : "정답 확인 · 인증 메일 받기"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/signup/apply" className="text-folk-cobalt hover:underline">
              가입 정보 수정
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
