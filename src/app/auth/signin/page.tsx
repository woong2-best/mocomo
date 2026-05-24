"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", { email, password, callbackUrl: "/" });
    setLoading(false);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl btn-rainbow flex items-center justify-center mb-2 text-xl font-black">
            M
          </div>
          <CardTitle className="text-2xl">{BRAND.name} 로그인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleCredentials} className="space-y-3">
            <Input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-xl" />
            <Input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-xl" />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
              소셜 로그인
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => signIn("google", { callbackUrl: "/" })} className="rounded-xl">
              Google
            </Button>
            <Button variant="outline" onClick={() => signIn("discord", { callbackUrl: "/" })} className="rounded-xl">
              Discord
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/forgot-password" className="text-[#1e88e5] hover:underline">
              비밀번호 찾기
            </Link>
            {" · "}
            <Link href="/auth/signup" className="text-[#1e88e5] hover:underline">
              회원가입
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
