"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { sendEmailAuthCode, verifyAuthCodeOnly, completeAuthWithCode } from "@/actions/auth";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { EmailAddressField } from "@/components/auth/email-address-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignupStepIndicator } from "@/components/auth/signup-step-indicator";
import { isTurnstileConfigured } from "@/lib/turnstile-client";

const TurnstileField = dynamic(
  () => import("@/components/auth/turnstile-field").then((m) => m.TurnstileField),
  {
    ssr: false,
    loading: () => (
      <p className="text-xs text-muted-foreground text-center py-3">보안 확인 준비 중...</p>
    ),
  }
);

function safeSessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* private mode / storage blocked */
  }
}

type Step = "code" | "reset-password" | "signup-done" | "reset-done";
type Mode = "signup" | "reset";

const UNREGISTERED_EMAIL_MSG = "등록되지 않은 이메일입니다.";

function isUnregisteredEmailError(result: { error?: string; code?: string }): boolean {
  return (
    result.error === UNREGISTERED_EMAIL_MSG || result.code === "EMAIL_NOT_REGISTERED"
  );
}

export function EmailVerifyFormInner() {
  const router = useRouter();
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
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);
  const [unregisteredDialogOpen, setUnregisteredDialogOpen] = useState(false);

  useEffect(() => {
    const notice = safeSessionGet("mocomo_signup_notice");
    if (notice) {
      setMessage(notice);
      safeSessionRemove("mocomo_signup_notice");
    }
    if (signupCodeAlreadySent) {
      try {
        router.prefetch("/");
      } catch {
        /* ignore */
      }
    }
  }, [router, signupCodeAlreadySent]);

  async function sendCode() {
    if (!email.trim()) return;
    const skipTurnstile =
      (mode === "signup" && signupCodeAlreadySent) || turnstileUnavailable;
    if (isTurnstileConfigured() && !turnstileToken && !skipTurnstile) {
      setError("아래 보안 확인을 완료해 주세요. 위젯이 보이지 않으면 「제한 모드로 계속」을 눌러 주세요.");
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
    if ("error" in result && result.error) {
      if (mode === "reset" && isUnregisteredEmailError(result)) {
        setError("");
        setMessage("");
        setUnregisteredDialogOpen(true);
        return;
      }
      setError(result.error);
      return;
    }
    setMessage(result.message ?? "인증 코드를 보냈습니다.");
  }

  async function verifySignupCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setLoading(true);
    setError("");
    setMessage("");
    const normalized = email.trim().toLowerCase();
    const result = await completeAuthWithCode(normalized, code, { mode: "signup" });
    if (result.error) {
      setLoading(false);
      setError(result.error);
      return;
    }

    const stored = safeSessionGet(SIGNUP_PASSWORD_SESSION_KEY);
    safeSessionRemove(SIGNUP_PASSWORD_SESSION_KEY);

    if (stored) {
      setMessage("로그인 중...");
      const signInResult = await signIn("credentials", {
        email: normalized,
        password: stored,
        redirect: false,
      });
      if (!signInResult?.error) {
        router.replace("/apt/move-in");
        return;
      }
      setSignupPassword(stored);
      setError("인증은 완료되었습니다. 아래에서 로그인해 주세요.");
      setStep("signup-done");
      setLoading(false);
      return;
    }

    setLoading(false);
    setStep("signup-done");
  }

  async function verifyResetCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setLoading(true);
    setError("");
    const result = await verifyAuthCodeOnly(email.trim().toLowerCase(), code);
    setLoading(false);
    if (result.error) {
      if (isUnregisteredEmailError(result)) {
        setUnregisteredDialogOpen(true);
        setError("");
        return;
      }
      setError(result.error);
      return;
    }
    setStep("reset-password");
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
    if (result.error) {
      if (isUnregisteredEmailError(result)) {
        setUnregisteredDialogOpen(true);
        setError("");
        return;
      }
      setError(result.error);
      return;
    }
    setStep("reset-done");
  }

  const unregisteredDialog = (
    <Dialog open={unregisteredDialogOpen} onOpenChange={setUnregisteredDialogOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>안내</DialogTitle>
          <DialogDescription className="text-base text-foreground pt-2">
            {UNREGISTERED_EMAIL_MSG}
          </DialogDescription>
        </DialogHeader>
        <Button
          type="button"
          className="w-full rounded-xl"
          onClick={() => setUnregisteredDialogOpen(false)}
        >
          확인
        </Button>
      </DialogContent>
    </Dialog>
  );

  if (step === "signup-done") {
    return (
      <>
        {unregisteredDialog}
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
      </>
    );
  }

  if (step === "reset-done") {
    return (
      <>
        {unregisteredDialog}
      <Card className="w-full max-w-md rounded-2xl">
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-green-700 font-medium">새 비밀번호가 설정되었습니다.</p>
          <Button asChild className="w-full rounded-xl">
            <Link href={`/auth/signin?email=${encodeURIComponent(email)}`}>로그인하기</Link>
          </Button>
        </CardContent>
      </Card>
      </>
    );
  }

  if (step === "reset-password") {
    return (
      <>
        {unregisteredDialog}
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
      </>
    );
  }

  return (
    <>
      {unregisteredDialog}
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

        <EmailAddressField
          id="email-verify"
          value={email}
          onChange={setEmail}
          required
        />

        {!signupCodeAlreadySent ? (
          <>
            <TurnstileField
              className="flex justify-center min-h-[65px]"
              showSkipImmediately
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
              onUnavailable={setTurnstileUnavailable}
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
              ? mode === "signup"
                ? "인증 · 로그인 중..."
                : "확인 중..."
              : mode === "reset"
                ? "코드 확인 → 비밀번호 설정"
                : "코드 확인 · 홈으로 이동"}
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
    </>
  );
}
