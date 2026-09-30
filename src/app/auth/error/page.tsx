import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const messages: Record<string, string> = {
    Configuration:
      "로그인 처리 중 서버 오류가 났습니다. 미가입 Google 계정은 생년월일 가입으로 보내야 하는데, OAuth 설정 문제나 서버 예외가 나면 이 화면으로 올 수 있습니다. Vercel 로그에서 [auth][error] 또는 OAUTH_SIGNUP을 확인하고, 아래 환경 변수를 점검한 뒤 Redeploy 하세요.",
    AccessDenied:
      "접근이 거부되었습니다. 이메일 인증이 완료되지 않았거나, 계정 이용이 제한된 상태일 수 있습니다.",
    Verification: "인증 링크가 만료되었습니다.",
    OAuthSignin:
      "소셜 로그인 시작에 실패했습니다. Vercel에 OAuth Client ID/Secret과 AUTH_URL을 확인하세요.",
    OAuthCallback:
      "OAuth 리디렉트 URI가 맞지 않습니다. 개발자 콘솔에 https://mocomo.net/api/auth/callback/discord (또는 /google, /twitter, /line) 를 등록하세요.",
    OAuthAccountNotLinked: "이 이메일은 다른 방식으로 가입되어 있습니다.",
    CredentialsSignin: "이메일 또는 비밀번호가 올바르지 않습니다.",
    Default: "로그인 중 오류가 발생했습니다.",
  };

  const text = messages[error ?? ""] ?? messages.Default;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full rounded-2xl">
        <CardHeader>
          <CardTitle>로그인 오류</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{text}</p>
          {error && <p className="text-xs font-mono text-destructive/80">code: {error}</p>}

          {error === "Configuration" && (
            <div className="text-sm bg-muted rounded-xl p-4 space-y-2">
              <p className="font-semibold">Vercel → Settings → Environment Variables (Production)</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  <code>AUTH_SECRET</code> — 터미널에서{" "}
                  <code>openssl rand -base64 32</code> 로 생성 (32자 이상)
                </li>
                <li>
                  <code>AUTH_URL</code> — 사이트 주소 (예: https://xxx.vercel.app)
                </li>
                <li>
                  <code>AUTH_TRUST_HOST</code> — <code>true</code>
                </li>
                <li>
                  <code>DATABASE_URL</code>, <code>DIRECT_URL</code> — Supabase 연결
                </li>
                <li>
                  <code>OAUTH_ENCRYPTION_KEY</code> — Google OAuth 필수 (32바이트 base64/hex)
                </li>
                <li>Google: <code>AUTH_GOOGLE_ID</code>, <code>AUTH_GOOGLE_SECRET</code></li>
                <li>Discord: <code>AUTH_DISCORD_ID</code>, <code>AUTH_DISCORD_SECRET</code></li>
                <li>X (Twitter): <code>AUTH_TWITTER_ID</code>, <code>AUTH_TWITTER_SECRET</code></li>
                <li>LINE: <code>LINE_CLIENT_ID</code>, <code>LINE_CLIENT_SECRET</code> (또는 <code>AUTH_LINE_ID</code>/<code>AUTH_LINE_SECRET</code>)</li>
                <li>Naver: <code>AUTH_NAVER_ID</code>, <code>AUTH_NAVER_SECRET</code></li>
                <li>
                  Discord Redirect: <code>https://mocomo.net/api/auth/callback/discord</code>
                </li>
                <li>
                  X Redirect: <code>https://mocomo.net/api/auth/callback/twitter</code>
                </li>
                <li>
                  LINE Redirect: <code>https://mocomo.net/api/auth/callback/line</code>
                </li>
                <li>
                  Naver Redirect: <code>https://mocomo.net/api/auth/callback/naver</code>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground pt-1">
                저장 후 Deployments → Redeploy. 상태 확인: <code>/api/health</code>
              </p>
            </div>
          )}

          <Button asChild className="w-full rounded-xl">
            <Link href="/auth/signin">로그인으로 돌아가기</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
