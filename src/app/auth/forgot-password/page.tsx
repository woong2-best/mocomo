"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPasswordRequest } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    const result = await resetPasswordRequest(email.trim().toLowerCase());
    setLoading(false);
    if ("error" in result && result.error) setError(result.error);
    else if (result.message) setMessage(result.message);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle>비밀번호 찾기</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="가입 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl"
            />
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "전송 중..." : "재설정 링크 보내기"}
            </Button>
            {message && (
              <p className="text-sm text-green-700 bg-green-500/10 rounded-xl px-3 py-2">{message}</p>
            )}
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
            )}
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            메일이 안 오면 Resend 무료 한도(가입 이메일만 수신)를 확인하세요.{" "}
            <a href="https://resend.com/domains" className="text-primary underline" target="_blank" rel="noreferrer">
              도메인 인증
            </a>
          </p>
          <Link href="/auth/reset-code" className="block text-center text-sm text-primary mt-2">
            메일의 6자리 코드로 재설정
          </Link>
          <Link href="/auth/signin" className="block text-center text-sm text-primary mt-4">
            로그인으로
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
