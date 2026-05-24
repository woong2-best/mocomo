"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resendVerificationEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Suspense } from "react";

function VerifyPendingInner() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
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

  return (
    <Card className="w-full max-w-md rounded-2xl">
      <CardHeader className="text-center">
        <CardTitle>이메일 인증 필요</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          가입하신 이메일로 <strong>인증 링크</strong>를 보냈습니다. 메일함(스팸함 포함)을 확인한 뒤
          링크를 클릭해 주세요.
        </p>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="가입 이메일"
          className="rounded-xl"
        />
        {message && <p className="text-green-600 bg-green-500/10 rounded-xl px-3 py-2">{message}</p>}
        {error && <p className="text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}
        <Button className="w-full rounded-xl" onClick={resend} disabled={loading || !email}>
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
