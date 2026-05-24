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
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await resetPasswordRequest(email);
    setMessage(result.message || "이메일을 확인하세요.");
    setLoading(false);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
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
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "전송 중..." : "재설정 링크 보내기"}
            </Button>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </form>
          <Link href="/auth/signin" className="block text-center text-sm text-primary mt-4">
            로그인으로
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
