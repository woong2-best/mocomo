import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
      t("auth.google_oauth_vercel_auth_error"),
    AccessDenied:
      t("auth.s1d5ti5f"),
    Verification: t("auth.s123zjn7"),
    OAuthSignin:
      t("auth.vercel_oauth_client_id_secret"),
    OAuthCallback:
      t("auth.oauth_uri_https_mocomo_net"),
    OAuthAccountNotLinked: t("auth.s4e4jau"),
    CredentialsSignin: t("auth.s1fb6yin"),
    Default: t("auth.s1c77czh"),
  };

  const text = messages[error ?? ""] ?? messages.Default;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full rounded-2xl">
        <CardHeader>
          <CardTitle>{t("auth.s11gfat4")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{text}</p>
          {error && <p className="text-xs font-mono text-destructive/80">code: {error}</p>}

          {error === "Configuration" && (
            <div className="text-sm bg-muted rounded-xl p-4 space-y-2">
              <p className="font-semibold">Vercel → Settings → Environment Variables (Production)</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  <code>AUTH_SECRET</code> — {t("auth.inTerminal")}{" "}
                  <code>openssl rand -base64 32</code> {t("auth.s1bq22b1")}
                </li>
                <li>
                  <code>AUTH_URL</code> {t("auth.https_xxx_vercel_app")}
                </li>
                <li>
                  <code>AUTH_TRUST_HOST</code> — <code>true</code>
                </li>
                <li>
                  <code>DATABASE_URL</code>, <code>DIRECT_URL</code> {t("auth.supabase")}
                </li>
                <li>
                  <code>OAUTH_ENCRYPTION_KEY</code> {t("auth.google_oauth_32_base64_hex")}
                </li>
                <li>Google: <code>AUTH_GOOGLE_ID</code>, <code>AUTH_GOOGLE_SECRET</code></li>
                <li>Discord: <code>AUTH_DISCORD_ID</code>, <code>AUTH_DISCORD_SECRET</code></li>
                <li>X (Twitter): <code>AUTH_TWITTER_ID</code>, <code>AUTH_TWITTER_SECRET</code></li>
                <li>LINE: <code>LINE_CLIENT_ID</code>, <code>LINE_CLIENT_SECRET</code> {t("auth.swrsc")} <code>AUTH_LINE_ID</code>/<code>AUTH_LINE_SECRET</code>)</li>
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
                {t("auth.deployments_redeploy")} <code>/api/health</code>
              </p>
            </div>
          )}

          <Button asChild className="w-full rounded-xl">
            <Link href="/auth/signin">{t("auth.syurgb0")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
