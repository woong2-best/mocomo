"use client";

import { useState } from "react";
import { completeSignupProfileOnboarding } from "@/actions/signup-identity-onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthBrandWordmark } from "@/components/auth/auth-brand-wordmark";
import { useLocale } from "@/components/providers/locale-provider";

type Props = {
  dest?: string;
  initialUsername: string;
  initialName: string;
};

export function CompleteProfileForm({ dest, initialUsername, initialName }: Props) {
  const { locale } = useLocale();
  const [username, setUsername] = useState(initialUsername);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await completeSignupProfileOnboarding({
        username: username.trim().toLowerCase(),
        name: name.trim(),
        dest,
      });
      if (result?.error) setError(result.error);
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

  const title =
    locale === "ko" ? "아이디 · 닉네임" : locale === "ja" ? "ID · ニックネーム" : "Username & nickname";
  const desc =
    locale === "ko"
      ? "MoCoMo에서 사용할 아이디와 닉네임을 정해 주세요."
      : "Choose your username and display name.";

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
                {locale === "ko" ? "아이디" : "Username"} *
              </span>
              <Input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))
                }
                placeholder="mocomo_user"
                autoComplete="username"
                className="rounded-xl"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                {locale === "ko" ? "영문·숫자·_ 3~20자" : "3–20 letters, numbers, underscore"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {locale === "ko" ? "닉네임" : "Nickname"} *
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                placeholder={locale === "ko" ? "표시 이름" : "Display name"}
                autoComplete="nickname"
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
