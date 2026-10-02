"use client";


import { errorText } from "@/lib/i18n/error-text";
import { useState } from "react";
import { completeSignupPasswordOnboarding } from "@/actions/signup-identity-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandWordmark } from "@/components/auth/auth-brand-wordmark";
import { useLocale } from "@/components/providers/locale-provider";

export function CompletePasswordForm({ dest }: { dest?: string }) {
  const { locale } = useLocale();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(locale === "ko" ? "비밀번호는 8자 이상이어야 합니다." : "Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError(locale === "ko" ? "비밀번호가 일치하지 않습니다." : "Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await completeSignupPasswordOnboarding({ password, dest });
      if (result?.error) setError(errorText(result.error));
    } catch {
      setError(
        locale === "ko"
          ? "저장에 실패했습니다. 다시 시도해 주세요."
          : "Could not save. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const title = locale === "ko" ? "비밀번호 설정" : locale === "ja" ? "パスワード" : "Set a password";
  const desc =
    locale === "ko"
      ? "아이디로 로그인할 때 사용할 비밀번호를 만드세요."
      : "Create a password for signing in with your username.";

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-[#0f1a33] min-h-[60vh]">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <AuthBrandWordmark className="mx-auto !text-foreground" />
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {locale === "ko" ? "비밀번호" : "Password"} *
              </span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="rounded-xl"
                required
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {locale === "ko" ? "비밀번호 확인" : "Confirm password"} *
              </span>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                className="rounded-xl"
                required
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "…" : locale === "ko" ? "다음" : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
