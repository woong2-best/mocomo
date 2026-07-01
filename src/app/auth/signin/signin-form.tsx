"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolkArtFrame, FolkArtStage, FolkBrushDivider, FolkSunFace } from "@/components/brand/folk-decor";
import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND } from "@/lib/brand";
import { loginErrorMessage } from "@/lib/auth-login-errors";

function safeCallbackUrl(raw: string): string {
  const path = raw.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export function SignInForm({
  googleOAuth,
  discordOAuth,
  twitterOAuth,
  callbackUrl: callbackUrlProp,
  initialEmail = "",
  errorParam,
}: {
  googleOAuth: boolean;
  discordOAuth: boolean;
  twitterOAuth: boolean;
  callbackUrl: string;
  initialEmail?: string;
  errorParam?: string | null;
}) {
  const router = useRouter();
  const callbackUrl = safeCallbackUrl(callbackUrlProp);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bannedNotice =
    errorParam === "banned"
      ? "이 계정은 이용이 제한되어 있습니다. 문의가 필요하면 운영자에게 연락해 주세요."
      : "";

  const callbackErrorMessage =
    errorParam === "Configuration"
      ? googleOAuth
        ? "서버 OAuth 설정 오류입니다. Vercel 환경 변수를 확인한 뒤 Redeploy 하세요."
        : "Google 로그인이 아직 설정되지 않았습니다. Vercel에 AUTH_GOOGLE_ID·AUTH_GOOGLE_SECRET을 추가하거나, 이메일로 로그인하세요."
      : errorParam === "OAuthAccountNotLinked"
        ? "이 이메일은 다른 로그인 방식으로 가입되어 있습니다."
        : errorParam
          ? "로그인에 실패했습니다. 다시 시도해 주세요."
          : "";

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    router.prefetch(callbackUrl);

    const result = await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error || result?.ok === false) {
      const code =
        typeof result === "object" && result && "code" in result
          ? String((result as { code?: string }).code ?? "")
          : undefined;
      setError(loginErrorMessage(code || result?.error, result?.error));
      return;
    }

    router.refresh();
    router.replace(callbackUrl);
  }

  const showSocial = googleOAuth || discordOAuth || twitterOAuth;

  return (
    <FolkArtStage className="folk-auth-canvas flex-1">
      <FolkArtFrame className="w-full max-w-md mx-auto">
        <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto relative mb-3">
            <FolkSunFace size={56} className="absolute -top-3 -left-6 opacity-70" />
            <div className="h-16 w-16 rounded-2xl bg-folk-cream border-2 border-folk-cobalt/30 flex items-center justify-center overflow-hidden p-1 mx-auto shadow-folk-sm">
              <BrandLogo size={56} priority />
            </div>
          </div>
          <CardTitle className="text-2xl font-display text-folk-cobalt folk-chunky-text">
            {BRAND.name} 로그인
          </CardTitle>
          <p className="text-sm text-folk-forest mt-1 font-medium">{BRAND.tagline}</p>
          {callbackUrl !== "/" && (
            <p className="text-xs text-muted-foreground mt-2">
              로그인 후 글쓰기 등 이전 화면으로 이동합니다.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {(error || bannedNotice || callbackErrorMessage) && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">
              {error || bannedNotice || callbackErrorMessage}
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
              <FolkBrushDivider className="opacity-50" />
              <p className="text-center text-xs text-folk-cobalt/70 font-display font-semibold -mt-1">
                소셜 로그인
              </p>
              <div className="space-y-2">
                {discordOAuth && (
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white"
                    onClick={() => signIn("discord", { callbackUrl })}
                  >
                    Discord로 로그인
                  </Button>
                )}
                {twitterOAuth && (
                  <Button
                    type="button"
                    className="w-full rounded-xl bg-black hover:bg-neutral-800 text-white"
                    onClick={() => signIn("twitter", { callbackUrl })}
                  >
                    X로 로그인
                  </Button>
                )}
                {googleOAuth && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => signIn("google", { callbackUrl })}
                    className="w-full rounded-xl"
                  >
                    Google로 로그인
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-center text-muted-foreground">
              Google·X·Discord 로그인은 Vercel에 OAuth 키 추가 후 사용할 수 있습니다.
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/email-verify" className="text-folk-cobalt hover:underline">
              이메일 인증 · 비밀번호 찾기
            </Link>
            {" · "}
            <Link href="/auth/signup" className="text-folk-cobalt hover:underline">
              회원가입
            </Link>
          </p>
        </CardContent>
      </Card>
      </FolkArtFrame>
    </FolkArtStage>
  );
}
