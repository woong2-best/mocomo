"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resendVerificationEmail, verifyEmailByCode } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";

function VerifyPendingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function resend() {
    if (!email) return;
    setLoading(true);
    setError("");
    setMessage("");
    const result = await resendVerificationEmail(email);
    setLoading(false);
    if (result.error) setError(result.error);
    else setMessage(result.message ?? "인증 메일을 보냈습니다.");
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !code) return;
    setLoading(true);
    setError("");
    const result = await verifyEmailByCode(email, code);
    setLoading(false);
    if (result.error) setError(result.error);
    else {
      router.push("/auth/signin?verified=1");
    }
  }

  return (
    <Card className="w-full max-w-md rounded-2xl">
      <CardHeader className="text-center">
        <CardTitle>이메일 인증</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-semibold">메일이 안 오는 경우</p>
          <p>1. 스팸함 확인</p>
          <p>
            2. Resend 무료는{" "}
            <a href="https://resend.com/domains" className="underline" target="_blank" rel="noreferrer">
              resend.com/domains
            </a>{" "}
            도메인 인증 전까지 <strong>Resend 가입 이메일</strong>로만 수신될 수 있습니다.
          </p>
          <p>3. 메일에 있는 <strong>6자리 코드</strong>를 아래에 입력해도 됩니다.</p>
        </div>

        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="가입 이메일"
          className="rounded-xl"
        />

        <form onSubmit={submitCode} className="space-y-3">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6자리 인증 코드"
            inputMode="numeric"
            maxLength={6}
            className="rounded-xl text-center text-lg tracking-widest"
          />
          <Button type="submit" className="w-full rounded-xl" disabled={loading || code.length !== 6}>
            코드로 인증하기
          </Button>
        </form>

        {message && <p className="text-green-700 bg-green-500/10 rounded-xl px-3 py-2">{message}</p>}
        {error && <p className="text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

        <Button variant="outline" className="w-full rounded-xl" onClick={resend} disabled={loading || !email}>
          {loading ? "전송 중..." : "인증 메일 다시 보내기"}
        </Button>

        <p className="text-center text-muted-foreground">
          인증 후{" "}
          <Link href="/auth/signin" className="text-primary hover:underline">
            로그인
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function VerifyPendingPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Suspense>
        <VerifyPendingInner />
      </Suspense>
    </div>
  );
}
