const MIN_SECRET_LENGTH = 32;

export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
}

export function getAuthUrl(): string | undefined {
  return (
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  );
}

export function getAuthConfigStatus() {
  const secret = getAuthSecret();
  const secretLength = secret?.length ?? 0;
  const googleId =
    process.env.AUTH_GOOGLE_ID?.trim() || process.env.GOOGLE_CLIENT_ID?.trim();
  const googleSecret =
    process.env.AUTH_GOOGLE_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET?.trim();

  return {
    secretConfigured: secretLength > 0,
    secretLengthOk: secretLength >= MIN_SECRET_LENGTH,
    authUrl: getAuthUrl() ?? null,
    trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.VERCEL === "1",
    googleOAuth: !!(googleId && googleSecret),
    googleIdPresent: !!googleId,
    googleSecretPresent: !!googleSecret,
    googleIdLength: googleId?.length ?? 0,
    googleSecretLength: googleSecret?.length ?? 0,
    discordOAuth: !!(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET),
    twitterOAuth: !!(process.env.AUTH_TWITTER_ID && process.env.AUTH_TWITTER_SECRET),
    lineOAuth: !!(
      (process.env.AUTH_LINE_ID?.trim() || process.env.LINE_CLIENT_ID?.trim()) &&
      (process.env.AUTH_LINE_SECRET?.trim() || process.env.LINE_CLIENT_SECRET?.trim())
    ),
    databaseUrlConfigured: !!process.env.DATABASE_URL,
    vercelEnv: process.env.VERCEL_ENV ?? null,
  };
}

export function isAuthConfigured(): boolean {
  const status = getAuthConfigStatus();
  return status.secretConfigured && status.secretLengthOk && status.databaseUrlConfigured;
}

export type ProductionSecurityStatus = {
  ok: boolean;
  issues: string[];
};

/** 프로덕션 배포 전 보안 환경 변수 점검 (Zero Trust / Secret 분리) */
export function getProductionSecurityStatus(): ProductionSecurityStatus {
  const issues: string[] = [];
  const isProd =
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (!isProd) return { ok: true, issues };

  const auth = getAuthConfigStatus();
  if (!auth.secretLengthOk) issues.push("AUTH_SECRET too short (min 32)");
  if (!process.env.CRON_SECRET?.trim()) {
    issues.push("CRON_SECRET missing (health/cron endpoints)");
  }
  if (auth.googleOAuth && !process.env.OAUTH_ENCRYPTION_KEY?.trim()) {
    issues.push("OAUTH_ENCRYPTION_KEY missing while Google OAuth enabled");
  }
  if (
    !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    !process.env.TURNSTILE_SECRET_KEY?.trim()
  ) {
    issues.push("Turnstile keys missing (signup bot protection)");
  }
  if (!process.env.UPSTASH_REDIS_REST_URL?.trim()) {
    issues.push("UPSTASH_REDIS_REST_URL missing (API rate limits degraded)");
  }

  return { ok: issues.length === 0, issues };
}
