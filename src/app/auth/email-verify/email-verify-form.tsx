"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  sendEmailAuthCode,
  verifyAuthCodeOnly,
  completeAuthWithCode,
} from "@/actions/auth";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { isTurnstileConfigured } from "@/lib/turnstile-client";

type Step = "code" | "reset-password" | "signup-done" | "reset-done";
type Mode = "signup" | "reset";

function EmailVerifyFormInner() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const initialMode = (searchParams.get("mode") === "reset" ? "reset" : "signup") as Mode;
  const signupCodeAlreadySent = initialMode === "signup" && !!initialEmail.trim();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<Step>("code");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [message, setMessage] = useState(
    initialEmail ? "이메일로 6자리 인증 코드를 확인해 주세요." : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    const notice = sessionStorage.getItem("mocomo_signup_notice");
    if (notice) {
      setMessage(notice);
      sessionStorage.removeItem("mocomo_signup_notice");
    }
  }, []);

  async function sendCode() {
    if (!email.trim()) return;
    const skipTurnstile = mode === "signup" && signupCodeAlreadySent;
    if (isTurnstileConfigured() && !turnstileToken && !skipTurnstile) {
      setError("아래 보안 확인을 완료해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const result = await sendEmailAuthCode(
      email.trim().toLowerCase(),
      mode,
      turnstileToken || undefined,
      skipTurnstile
    );
    setLoading(false);
    if ("error" in result && result.error) setError(result.error);
    else setMessage(result.message ?? "인증 코드를 보냈습니다.");
  }

  async function verifySignupCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setLoading(true);
    setError("");
    const normalized = email.trim().toLowerCase();
    const check = await verifyAuthCodeOnly(normalized, code);
    if (check.error) {
      setLoading(false);
      setError(check.error);
      return;
    }
    const result = await completeAuthWithCode(normalized, code, { mode: "signup" });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    const stored =
      typeof window !== "undefined"
        ? sessionStorage.getItem(SIGNUP_PASSWORD_SESSION_KEY)
        : null;
    if (stored) {
      setSignupPassword(stored);
      sessionStorage.removeItem(SIGNUP_PASSWORD_SESSION_KEY);
    }
    setStep("signup-done");
  }

  async function verifyResetCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setLoading(true);
    setError("");
    const result = await verifyAuthCodeOnly(email.trim().toLowerCase(), code);
    setLoading(false);
    if (result.error) setError(result.error);
    else setStep("reset-password");
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await completeAuthWithCode(email.trim().toLowerCase(), code, {
      mode: "reset",
      newPassword,
    });
    setLoading(false);
    if (result.error) setError(result.error);
    else setStep("reset-done");
  }

  if (step === "signup-done") {
    return (
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle>이메일 인증 완료</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-green-700 bg-green-500/10 rounded-xl px-3 py-2 text-center">
            인증이 완료되었습니다. 아래 비밀번호로 로그인하세요.
          </p>
          {signupPassword ? (
            <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
              <p className="text-xs text-muted-foreground">가입 시 설정한 비밀번호</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-base font-mono break-all">
                  {showPassword ? signupPassword : "••••••••"}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-lg"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "숨기기" : "보기"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center">
              가입할 때 입력한 비밀번호로 로그인하세요. 잊으셨다면 아래에서 새로 설정할 수
              있습니다.
            </p>
          )}
          <Button asChild className="w-full rounded-xl">
            <Link href={`/auth/signin?email=${encodeURIComponent(email)}`}>로그인하기</Link>
          </Button>
          {!signupPassword && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                setMode("reset");
                setStep("code");
                setCode("");
                setMessage("새 비밀번호를 설정하려면 인증 코드를 다시 받으세요.");
                setError("");
              }}
            >
              새 비밀번호 설정하기
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === "reset-done") {
    return (
      <Card className="w-full max-w-md rounded-2xl">
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-green-700 font-medium">새 비밀번호가 설정되었습니다.</p>
          <Button asChild className="w-full rounded-xl">
            <Link href={`/auth/signin?email=${encodeURIComponent(email)}`}>로그인하기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "reset-password") {
    return (
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle>새 비밀번호 설정</CardTitle>
          <p className="text-sm text-muted-foreground">인증 코드 확인 완료. 새 비밀번호를 입력하세요.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitNewPassword} className="space-y-3">
            <Input
              type="password"
              placeholder="새 비밀번호 (8자 이상)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              className="rounded-xl"
            />
            <Input
              type="password"
              placeholder="새 비밀번호 확인"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              minLength={8}
              required
              className="rounded-xl"
            />
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
            )}
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "저장 중..." : "비밀번호 변경"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl"
              onClick={() => setStep("code")}
            >
              코드 다시 입력
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md rounded-2xl">
      <CardHeader className="text-center space-y-2">
        {mode === "signup" && signupCodeAlreadySent ? (
          <SignupStepIndicator step={3} />
        ) : null}
        <CardTitle>
          {signupCodeAlreadySent ? "이메일 인증 코드 입력" : "이메일 인증 · 비밀번호 찾기"}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {signupCodeAlreadySent
            ? "메일함(스팸함 포함)의 6자리 코드를 입력하세요."
            : "6자리 코드로 이메일을 확인하고, 필요하면 비밀번호를 설정합니다."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex rounded-xl border p-1 bg-muted/30">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("signup")}
          >
            가입 인증
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "reset" ? "bg-background shadow-sm" : "text-muted-foreground"
            }`}
            onClick={() => setMode("reset")}
          >
            비밀번호 찾기
          </button>
        </div>

        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="가입 이메일"
          autoComplete="email"
          className="rounded-xl"
        />

        {!signupCodeAlreadySent ? (
          <>
            <TurnstileField
              className="flex justify-center min-h-[65px]"
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={sendCode}
              disabled={loading || !email.trim()}
            >
              {loading ? "전송 중..." : "인증 코드 보내기"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              이메일·IP당 요청 횟수가 제한됩니다. 스팸 방지를 위해 보안 확인이 필요할 수 있습니다.
            </p>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={sendCode}
            disabled={loading || !email.trim()}
          >
            {loading ? "전송 중..." : "인증 코드 다시 받기"}
          </Button>
        )}

        <form
          onSubmit={mode === "reset" ? verifyResetCode : verifySignupCode}
          className="space-y-3"
        >
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6자리 인증 코드"
            inputMode="numeric"
            maxLength={6}
            className="rounded-xl text-center text-2xl tracking-[0.4em] font-semibold"
          />
          <Button type="submit" className="w-full rounded-xl" disabled={loading || code.length !== 6}>
            {loading
              ? "확인 중..."
              : mode === "reset"
                ? "코드 확인 → 비밀번호 설정"
                : "코드 확인 → 가입 완료"}
          </Button>
        </form>

        {message && <p className="text-green-700 bg-green-500/10 rounded-xl px-3 py-2">{message}</p>}
        {error && <p className="text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

        <p className="text-center text-muted-foreground text-xs">스팸함도 확인해 주세요.</p>
        <Link href="/auth/signin" className="block text-center text-sm text-primary">
          로그인으로
        </Link>
      </CardContent>
    </Card>
  );
}

export function EmailVerifyForm() {
  return (
    <Suspense>
      <EmailVerifyFormInner />
    </Suspense>
  );
}
