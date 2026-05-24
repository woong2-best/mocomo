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
      "Vercel Production 환경 변수가 빠졌거나 잘못됐습니다. AUTH_SECRET(32자 이상), DATABASE_URL, AUTH_URL을 확인한 뒤 Redeploy 하세요.",
    AccessDenied: "접근이 거부되었습니다.",
    Verification: "인증 링크가 만료되었습니다.",
    OAuthSignin: "소셜 로그인 시작에 실패했습니다. Google Client ID/Secret을 확인하세요.",
    OAuthCallback:
      "Google 리디렉트 URI가 맞지 않습니다. Google Cloud Console에 https://<도메인>/api/auth/callback/google 를 등록하세요.",
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
                <li>Google: <code>AUTH_GOOGLE_ID</code>, <code>AUTH_GOOGLE_SECRET</code></li>
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
