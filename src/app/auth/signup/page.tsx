"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const result = await registerUser({
      email: form.get("email") as string,
      username: form.get("username") as string,
      password: form.get("password") as string,
      name: form.get("name") as string,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/auth/signin");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{BRAND.name} 가입</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input name="email" type="email" placeholder="이메일" required className="rounded-xl" />
            <Input name="username" placeholder="닉네임" required minLength={3} className="rounded-xl" />
            <Input name="name" placeholder="표시 이름 (선택)" className="rounded-xl" />
            <Input name="password" type="password" placeholder="비밀번호 (8자 이상)" required minLength={8} className="rounded-xl" />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link href="/auth/signin" className="text-[#1e88e5] hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
