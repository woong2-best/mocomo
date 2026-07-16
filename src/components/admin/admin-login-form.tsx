"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandLogo } from "@/components/brand/brand-logo";

export function AdminLoginForm({
  callbackUrl,
  errorParam,
  currentUsername,
}: {
  callbackUrl: string;
  errorParam: string | null;
  currentUsername: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "forbidden"
      ? "현재 계정에는 관리자 권한이 없습니다. 오너 계정으로 다시 로그인해 주세요."
      : null
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 일반 사이트 세션과 분리: 관리자 로그인 전 기존 세션 정리
    try {
      await signOut({ redirect: false });
    } catch {
      /* ignore */
    }

    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!res || res.error) {
      setError("로그인에 실패했습니다. 이메일·비밀번호를 확인해 주세요.");
      return;
    }

    router.replace(callbackUrl.startsWith("/") ? callbackUrl : "/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-100 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <BrandLogo className="h-10 w-auto" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">관리자 로그인</h1>
          <p className="text-sm text-muted-foreground">
            MoCoMo Admin CMS · OWNER / 스태프 전용
          </p>
          {currentUsername ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              현재 브라우저 세션: @{currentUsername} — 아래 로그인으로 관리자 계정으로
              전환됩니다.
            </p>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              이메일
            </label>
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="owner@mocomo.net"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              비밀번호
            </label>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "로그인 중…" : "관리자 로그인"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          오너 계정: <span className="font-mono">mocomocompany</span>
        </p>
      </div>
    </div>
  );
}
