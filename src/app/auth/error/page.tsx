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
    Configuration: "서버 AUTH_SECRET 또는 OAuth 설정을 확인하세요.",
    AccessDenied: "접근이 거부되었습니다.",
    Verification: "인증 링크가 만료되었습니다.",
    OAuthSignin: "소셜 로그인 시작에 실패했습니다.",
    OAuthCallback: "소셜 로그인 콜백 오류 — Google 리디렉트 URI를 확인하세요.",
    OAuthAccountNotLinked: "이 이메일은 다른 방식으로 가입되어 있습니다.",
    Default: "로그인 중 오류가 발생했습니다.",
  };

  const text = messages[error ?? ""] ?? messages.Default;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full rounded-2xl">
        <CardHeader>
          <CardTitle>로그인 오류</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{text}</p>
          {error && <p className="text-xs font-mono text-destructive/80">code: {error}</p>}
          <Button asChild className="w-full rounded-xl">
            <Link href="/auth/signin">로그인으로 돌아가기</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
