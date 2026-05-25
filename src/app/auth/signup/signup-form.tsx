"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/actions/auth";
import { SIGNUP_PASSWORD_SESSION_KEY } from "@/lib/auth-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

export function SignUpForm({
  googleOAuth,
  discordOAuth,
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showSocial = googleOAuth || discordOAuth;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const email = (form.get("email") as string).trim().toLowerCase();
    const password = form.get("password") as string;
    const username = ((form.get("username") as string) || "").trim().toLowerCase();

    try {
      const result = await registerUser({
        email,
        username,
        password,
        name: (form.get("name") as string) || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.needsVerification) {
        sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, password);
        if (result.message) {
          sessionStorage.setItem("mocomo_signup_notice", result.message);
        }
        router.push(`/auth/email-verify?email=${encodeURIComponent(email)}&mode=signup`);
        return;
      }
    } catch {
      setError("서버 연결 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl btn-rainbow flex items-center justify-center mb-2 text-xl font-black">
            M
          </div>
          <CardTitle className="text-2xl">{BRAND.name} 회원가입</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">{BRAND.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              name="email"
              type="email"
              placeholder="이메일"
              required
              autoComplete="email"
              className="rounded-xl"
            />
            <Input
              name="username"
              placeholder="닉네임 (영문·숫자·_)"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              autoComplete="username"
              className="rounded-xl"
            />
            <Input
              name="name"
              placeholder="표시 이름 (선택)"
              autoComplete="name"
              className="rounded-xl"
            />
            <Input
              name="password"
              type="password"
              placeholder="비밀번호 (8자 이상)"
              required
              minLength={8}
              autoComplete="new-password"
              className="rounded-xl"
            />
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              회원가입 시{" "}
              <Link href="/legal/terms" className="text-primary hover:underline" target="_blank">
                이용약관
              </Link>
              ,{" "}
              <Link href="/legal/privacy" className="text-primary hover:underline" target="_blank">
                개인정보처리방침
              </Link>
              ,{" "}
              <Link href="/legal/policy" className="text-primary hover:underline" target="_blank">
                운영정책
              </Link>
              에 동의한 것으로 간주됩니다.
            </p>
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "가입 중..." : "회원가입"}
            </Button>
          </form>

          {showSocial ? (
            <>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
                  또는 소셜로 가입
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {googleOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                  >
                    Google
                  </Button>
                )}
                {discordOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => signIn("discord", { callbackUrl: "/" })}
                  >
                    Discord
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              Google 가입은 Vercel에 OAuth 키 추가 후 사용할 수 있습니다.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있나요?{" "}
            <Link href="/auth/signin" className="text-[#1e88e5] hover:underline font-medium">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
