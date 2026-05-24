"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPasswordRequest } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const normalized = email.trim().toLowerCase();
    const result = await resetPasswordRequest(normalized);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    router.push(`/auth/reset-code?email=${encodeURIComponent(normalized)}`);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader>
          <CardTitle>비밀번호 찾기</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            가입 이메일로 <strong>6자리 인증 코드</strong>를 보내드립니다.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="가입 이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-xl"
            />
            <Button type="submit" className="w-full rounded-xl" disabled={loading || !email.trim()}>
              {loading ? "전송 중..." : "인증 코드 보내기"}
            </Button>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
            )}
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            코드 확인 후 <strong>새 비밀번호</strong>를 설정할 수 있습니다. (기존 비밀번호는 보안상
            알려드릴 수 없습니다)
          </p>
          <Link href="/auth/signin" className="block text-center text-sm text-primary mt-4">
            로그인으로
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
