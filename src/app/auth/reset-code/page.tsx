"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { resetPasswordByCode } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ResetByCodeForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
          <p className="text-green-700">비밀번호가 변경되었습니다.</p>
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
        <CardTitle>코드로 비밀번호 재설정</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="가입 이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl"
          />
          <Input
            placeholder="6자리 코드"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            required
            className="rounded-xl text-center tracking-widest"
          />
          <Input
            type="password"
            placeholder="새 비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="rounded-xl"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            {loading ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
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
