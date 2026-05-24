"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  resetPasswordByCode,
  resetPasswordRequest,
  verifyResetCode,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ResetByCodeForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";

  const [step, setStep] = useState<"code" | "password">("code");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState(
    initialEmail ? "이메일로 6자리 인증 코드를 보냈습니다. 스팸함도 확인해 주세요." : ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function resendCode() {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    const result = await resetPasswordRequest(email.trim().toLowerCase());
    setLoading(false);
    if ("error" in result && result.error) setError(result.error);
    else setMessage(result.message ?? "인증 코드를 다시 보냈습니다.");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setLoading(true);
    setError("");
    const result = await verifyResetCode(email.trim().toLowerCase(), code);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      setMessage("");
      setStep("password");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await resetPasswordByCode(email.trim().toLowerCase(), code, password);
    setLoading(false);
    if (result.error) setError(result.error);
    else setDone(true);
  }

  if (done) {
    return (
      <Card className="max-w-md w-full rounded-2xl">
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-green-700 font-medium">새 비밀번호가 설정되었습니다.</p>
          <p className="text-sm text-muted-foreground">아래 버튼으로 로그인하세요.</p>
          <Button asChild className="w-full rounded-xl">
            <Link href="/auth/signin">로그인</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full rounded-2xl">
      <CardHeader>
        <CardTitle>{step === "code" ? "인증 코드 입력" : "새 비밀번호 설정"}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {step === "code"
            ? "이메일로 받은 6자리 숫자를 입력하세요."
            : "인증 완료! 사용할 새 비밀번호를 입력하세요."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "code" ? (
          <form onSubmit={verifyCode} className="space-y-3">
            <Input
              type="email"
              placeholder="가입 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-xl"
            />
            <Input
              placeholder="6자리 인증 코드"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              required
              className="rounded-xl text-center text-2xl tracking-[0.4em] font-semibold"
            />
            <Button type="submit" className="w-full rounded-xl" disabled={loading || code.length !== 6}>
              {loading ? "확인 중..." : "코드 확인"}
            </Button>
          </form>
        ) : (
          <form onSubmit={changePassword} className="space-y-3">
            <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              {email}
            </div>
            <Input
              type="password"
              placeholder="새 비밀번호 (8자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="rounded-xl"
            />
            <Input
              type="password"
              placeholder="새 비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className="rounded-xl"
            />
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "변경 중..." : "비밀번호 변경"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full rounded-xl"
              onClick={() => setStep("code")}
              disabled={loading}
            >
              코드 다시 입력
            </Button>
          </form>
        )}

        {message && <p className="text-sm text-green-700 bg-green-500/10 rounded-xl px-3 py-2">{message}</p>}
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

        {step === "code" && (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl"
            onClick={resendCode}
            disabled={loading || !email.trim()}
          >
            {loading ? "전송 중..." : "인증 코드 다시 보내기"}
          </Button>
        )}

        <Link href="/auth/signin" className="block text-center text-sm text-primary">
          로그인으로
        </Link>
      </CardContent>
    </Card>
  );
}

export default function ResetByCodePage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense>
        <ResetByCodeForm />
      </Suspense>
    </div>
  );
}
