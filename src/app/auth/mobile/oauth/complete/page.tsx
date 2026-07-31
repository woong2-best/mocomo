import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import {
  buildMobileOAuthRedirectUrl,
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
} from "@/lib/mobile-oauth-handoff";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MobileDeepLinkRedirect } from "./mobile-deep-link-redirect";

export default async function MobileOAuthCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const sp = await searchParams;
  const platform = sp.platform === "ios" ? "ios" : "android";
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/auth/signin?from=mobile&platform=${platform}&callbackUrl=${encodeURIComponent(
        `/auth/mobile/oauth/complete?platform=${platform}&from=mobile`
      )}`
    );
  }

  const jar = await cookies();
  const redirectCookie = jar.get(MOBILE_OAUTH_REDIRECT_COOKIE)?.value;
  const redirectUri = redirectCookie ? decodeURIComponent(redirectCookie) : null;

  let redirectUrl: string;
  try {
    const built = await buildMobileOAuthRedirectUrl({
      userId: session.user.id,
      platform,
      redirectUri,
    });
    redirectUrl = built.url;
  } catch (e) {
    console.error("[auth/mobile/oauth/complete]", e);
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle>앱 연동 실패</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground text-center">
            토큰을 발급하지 못했습니다. 앱에서 다시 시도해 주세요.
          </CardContent>
        </Card>
      </div>
    );
  }

  try {
    jar.delete(MOBILE_OAUTH_COOKIE);
    jar.delete(MOBILE_OAUTH_REDIRECT_COOKIE);
  } catch {
    /* ignore */
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm rounded-2xl shadow-lg border-border">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden p-1">
            <BrandLogo size={48} priority />
          </div>
          <CardTitle className="text-xl font-semibold">앱으로 돌아가는 중</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          <MobileDeepLinkRedirect url={redirectUrl} />
        </CardContent>
      </Card>
    </div>
  );
}
