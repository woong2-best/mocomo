"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { preLoginCheck } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

function SignInFormInner({
  googleOAuth,
  discordOAuth,
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const callbackErrorMessage =
    callbackError === "Configuration"
      ? googleOAuth
        ? "서버 OAuth 설정 오류입니다. Vercel 환경 변수를 확인한 뒤 Redeploy 하세요."
        : "Google 로그인이 아직 설정되지 않았습니다. Vercel에 AUTH_GOOGLE_ID·AUTH_GOOGLE_SECRET을 추가하거나, 이메일로 로그인하세요."
      : callbackError === "OAuthAccountNotLinked"
        ? "이 이메일은 다른 로그인 방식으로 가입되어 있습니다."
        : callbackError
          ? "로그인에 실패했습니다. 다시 시도해 주세요."
          : "";

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    const check = await preLoginCheck(normalizedEmail, password);
    if (!check.ok) {
      setLoading(false);
      if (check.error === "EMAIL_NOT_VERIFIED") {
        setError("이메일 인증이 필요합니다.");
        router.push(
          `/auth/email-verify?email=${encodeURIComponent(normalizedEmail)}&mode=signup`
        );
        return;
      }
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    const result = await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        result.error === "Configuration"
          ? "로그인 설정 오류입니다. /api/health 를 확인하거나 이메일·비밀번호를 다시 확인하세요."
          : "이메일 또는 비밀번호가 올바르지 않습니다."
      );
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl") || "/";
    router.push(callbackUrl);
    router.refresh();
  }

  const showSocial = googleOAuth || discordOAuth;

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl btn-rainbow flex items-center justify-center mb-2 text-xl font-black">
            M
          </div>
          <CardTitle className="text-2xl">{BRAND.name} 로그인</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error || callbackErrorMessage) && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
              {error || callbackErrorMessage}
            </p>
          )}

          <form onSubmit={handleCredentials} className="space-y-3">
            <Input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="rounded-xl"
            />
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="rounded-xl"
            />
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          {showSocial ? (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2">
                  소셜 로그인
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {googleOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                    className="rounded-xl"
                  >
                    Google
                  </Button>
                )}
                {discordOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => signIn("discord", { callbackUrl: "/" })}
                    className="rounded-xl"
                  >
                    Discord
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              Google 로그인은 Vercel에 OAuth 키 추가 후 사용할 수 있습니다.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/email-verify" className="text-[#1e88e5] hover:underline">
              이메일 인증 · 비밀번호 찾기
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

export function SignInForm(props: { googleOAuth: boolean; discordOAuth: boolean }) {
  return (
    <Suspense>
      <SignInFormInner {...props} />
    </Suspense>
  );
}
