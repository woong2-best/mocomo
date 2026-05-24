"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { resetPasswordConfirm } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !email) return;
    setLoading(true);
    setError("");
    const result = await resetPasswordConfirm({ email, token, password });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/auth/signin?reset=1");
  }

  if (!token || !email) {
    return (
      <Card className="max-w-md mx-auto glass">
        <CardContent className="p-6 text-center text-muted-foreground">
          유효하지 않은 링크입니다.
          <Link href="/auth/forgot-password" className="block mt-4 text-primary">
            다시 요청
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto glass">
      <CardHeader>
        <CardTitle>새 비밀번호</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="새 비밀번호 (8자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Suspense fallback={<p className="text-muted-foreground">로딩...</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
